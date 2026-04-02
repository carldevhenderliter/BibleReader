import { cp, mkdir } from "fs/promises";
import { createWriteStream } from "fs";
import path from "path";
import { Readable } from "stream";
import { pipeline } from "stream/promises";

const rootDir = process.cwd();
const publicDir = path.join(rootDir, "public", "kokoro");
const modelRoot = path.join(
  publicDir,
  "model",
  "onnx-community",
  "Kokoro-82M-v1.0-ONNX"
);
const modelFiles = [
  "config.json",
  "tokenizer.json",
  "tokenizer_config.json",
  "onnx/model_quantized.onnx"
];

async function downloadFile(url, destination) {
  const response = await fetch(url);

  if (!response.ok || !response.body) {
    throw new Error(`Failed to download ${url}: ${response.status} ${response.statusText}`);
  }

  await mkdir(path.dirname(destination), { recursive: true });
  await pipeline(Readable.fromWeb(response.body), createWriteStream(destination));
}

async function main() {
  await mkdir(publicDir, { recursive: true });

  for (const file of modelFiles) {
    const url = `https://huggingface.co/onnx-community/Kokoro-82M-v1.0-ONNX/resolve/main/${file}`;
    const destination = path.join(modelRoot, file);
    await downloadFile(url, destination);
  }

  await mkdir(path.join(publicDir, "voices"), { recursive: true });
  await mkdir(path.join(publicDir, "wasm"), { recursive: true });

  await cp(path.join(rootDir, "node_modules", "kokoro-js", "voices"), path.join(publicDir, "voices"), {
    recursive: true
  });
  await cp(
    path.join(rootDir, "node_modules", "@huggingface", "transformers", "dist", "ort-wasm-simd-threaded.jsep.wasm"),
    path.join(publicDir, "wasm", "ort-wasm-simd-threaded.jsep.wasm")
  );
  await cp(
    path.join(rootDir, "node_modules", "@huggingface", "transformers", "dist", "ort-wasm-simd-threaded.jsep.mjs"),
    path.join(publicDir, "wasm", "ort-wasm-simd-threaded.jsep.mjs")
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
