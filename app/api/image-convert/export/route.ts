import { convertServer, webpFilename } from "@/lib/image-convert/convert-server";
import { isPresetKey, DEFAULT_PRESET } from "@/lib/image-convert/presets";
import { ALLOWED_MIME, MAX_FILE_BYTES } from "@/lib/image-convert/types";
import { NextResponse } from "next/server";

export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");
    const presetRaw = String(formData.get("preset") ?? DEFAULT_PRESET);

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Image file is required." }, { status: 400 });
    }

    if (!ALLOWED_MIME.has(file.type)) {
      return NextResponse.json(
        { error: "Only JPEG and PNG images are supported." },
        { status: 400 },
      );
    }

    if (file.size > MAX_FILE_BYTES) {
      return NextResponse.json(
        { error: "File exceeds 20 MB limit." },
        { status: 400 },
      );
    }

    const preset = isPresetKey(presetRaw) ? presetRaw : DEFAULT_PRESET;
    const buffer = Buffer.from(await file.arrayBuffer());
    const output = await convertServer(buffer, preset);
    const filename = webpFilename(file.name);

    return new NextResponse(new Uint8Array(output), {
      status: 200,
      headers: {
        "Content-Type": "image/webp",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": String(output.length),
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Image export failed.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
