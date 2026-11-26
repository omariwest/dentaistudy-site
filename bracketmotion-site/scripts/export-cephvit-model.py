#!/usr/bin/env python3
"""Reproduce the reviewed CephViT ONNX model from its published checkpoint.

Runs in GitHub Actions only. Does not read patient data or modify application state.
"""
from __future__ import annotations

import hashlib
import os
import tempfile
import urllib.request
import zlib
from pathlib import Path

REPO_REV = "220de6977793eb1b80aa982d04b33f0aa40bef1c"
BASE_URL = f"https://huggingface.co/nlm-dir/CephViT/resolve/{REPO_REV}/"
KEY = b"2d65697cf6ad50c95a0a2558c73658a7"  # Author-published ASCII AES-256 key, not an app secret.
ENCRYPTED_SHA = "018b89108a18be63689aea6ce7d2cedbc22c09e1fe28558b5bddd901efb3f558"
DECRYPTED_SHA = "5aee9c220e3a36e119325ef4cc3c750ca5d318cac03d30536621289d8a05fe92"
FP32_SHA = "1c664fdc7651a2cd87b5a00887c3537ccb3a5cb059806521453d8f76ec5db46a"
INT8_SHA = "0d3984e6809a1708f2e41645162273d88e1763f7b03d4e1b3438e5ab8d045044"
OUTFILE = Path("cephvit-dynamic-int8.onnx")


def checksum(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        while block := stream.read(4 * 1024 * 1024):
            digest.update(block)
    return digest.hexdigest()


def require_hash(path: Path, expected: str) -> None:
    got = checksum(path)
    if got != expected:
        raise RuntimeError(f"{path} checksum mismatch: {got} != {expected}")
    print(f"Verified {path.name}: {got}", flush=True)


def download(name: str) -> Path:
    dest = Path(name)
    request = urllib.request.Request(BASE_URL + name, headers={"User-Agent": "BracketMotion-model-export/1.0"})
    with urllib.request.urlopen(request, timeout=150) as response, dest.open("wb") as stream:
        while chunk := response.read(4 * 1024 * 1024):
            stream.write(chunk)
    return dest


def decrypt(encrypted: Path, dest: Path) -> None:
    from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes

    with encrypted.open("rb") as source:
        size = source.seek(0, os.SEEK_END)
        source.seek(0)
        nonce = source.read(12)
        source.seek(-16, os.SEEK_END)
        tag = source.read(16)
        source.seek(12)
        remaining = size - 28
        cipher = Cipher(algorithms.AES(KEY), modes.GCM(nonce, tag)).decryptor()
        gzip = zlib.decompressobj(wbits=31)
        with dest.open("wb") as sink:
            while remaining > 0:
                chunk = source.read(min(4 * 1024 * 1024, remaining))
                if not chunk:
                    raise RuntimeError("Encrypted checkpoint truncated")
                remaining -= len(chunk)
                sink.write(gzip.decompress(cipher.update(chunk)))
            sink.write(gzip.decompress(cipher.finalize()))
            sink.write(gzip.flush())


def main() -> None:
    import torch
    import onnx
    from onnxruntime.quantization import quantize_dynamic, QuantType

    torch.set_num_threads(2)
    # The original model module is revision-pinned, rather than copied or modified.
    model_source = download("model.py")
    print(f"Model code: {model_source.stat().st_size} bytes")
    encrypted = download("best.pt.enc")
    require_hash(encrypted, ENCRYPTED_SHA)
    checkpoint_path = Path("best.pt")
    decrypt(encrypted, checkpoint_path)
    require_hash(checkpoint_path, DECRYPTED_SHA)
    encrypted.unlink()
    from model import ViTHeatmap

    state = torch.load(checkpoint_path, map_location="cpu", weights_only=True, mmap=True)
    args = state["args"]
    if args.get("num_landmarks") != 29 or tuple((args["input_height"], args["input_width"])) != (512, 512):
        raise RuntimeError("Unexpected upstream CephViT landmark count or input shape")
    net = ViTHeatmap(
        num_landmarks=29, model_name=args["vit_name"], pretrained=False, img_size=(512, 512)
    )
    net.load_state_dict(state["model_state_dict"])
    net.eval()
    del state
    checkpoint_path.unlink()
    tensor = torch.zeros((1, 3, 512, 512), dtype=torch.float32)
    full = Path("cephvit-fp32.onnx")
    with torch.inference_mode():
        torch.onnx.export(
            net, tensor, str(full), input_names=["image"], output_names=["heatmaps"],
            opset_version=18, dynamo=False, do_constant_folding=True,
        )
    onnx.checker.check_model(str(full))
    require_hash(full, FP32_SHA)
    quantize_dynamic(str(full), str(OUTFILE), weight_type=QuantType.QInt8)
    require_hash(OUTFILE, INT8_SHA)
    if OUTFILE.stat().st_size != 90531621:
        raise RuntimeError("Unexpected quantized model size")
    full.unlink()
    print("Reproducible CephViT ONNX artifact ready:", OUTFILE, flush=True)


if __name__ == "__main__":
    main()
