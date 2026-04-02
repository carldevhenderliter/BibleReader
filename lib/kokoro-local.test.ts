describe("kokoro local loader", () => {
  beforeEach(() => {
    jest.resetModules();
    process.env.NEXT_PUBLIC_BASE_PATH = "/BibleReader";
  });

  afterEach(() => {
    delete process.env.NEXT_PUBLIC_BASE_PATH;
  });

  it("configures local assets and rewrites voice fetches to same-origin files", async () => {
    const originalFetch = jest.fn().mockResolvedValue({ ok: true });
    const fromPretrained = jest.fn().mockResolvedValue({
      generate: jest.fn().mockResolvedValue({
        toWav: () => new ArrayBuffer(8)
      })
    });
    const transformersEnv = {
      allowRemoteModels: true,
      allowLocalModels: false,
      localModelPath: "",
      backends: {
        onnx: {
          wasm: {
            wasmPaths: ""
          }
        }
      }
    };
    const kokoroEnv = {
      wasmPaths: ""
    };

    Object.defineProperty(window, "fetch", {
      configurable: true,
      writable: true,
      value: originalFetch
    });

    jest.doMock("@huggingface/transformers", () => ({
      env: transformersEnv
    }));
    jest.doMock("kokoro-js", () => ({
      KokoroTTS: {
        from_pretrained: fromPretrained
      },
      env: kokoroEnv
    }));

    const { loadLocalKokoroTts } = await import("@/lib/kokoro-local");

    await loadLocalKokoroTts();

    expect(transformersEnv.allowRemoteModels).toBe(false);
    expect(transformersEnv.allowLocalModels).toBe(true);
    expect(transformersEnv.localModelPath).toBe("/BibleReader/kokoro/model/");
    expect(transformersEnv.backends.onnx.wasm.wasmPaths).toBe("/BibleReader/kokoro/wasm/");
    expect(kokoroEnv.wasmPaths).toBe("/BibleReader/kokoro/wasm/");

    await window.fetch(
      "https://huggingface.co/onnx-community/Kokoro-82M-v1.0-ONNX/resolve/main/voices/af_heart.bin"
    );

    expect(originalFetch).toHaveBeenCalledWith(
      "/BibleReader/kokoro/voices/af_heart.bin",
      undefined
    );
  });
});
