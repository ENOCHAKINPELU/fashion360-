import type { FabricLibraryItemData } from "@/features/design-gallery/types";
import type { DesignTextureInput } from "@/lib/validations/design-preview";

/**
 * Derives a PRIMARY DesignTexture entry from the fabric a designer already
 * selects in DesignCustomizationForm — so uploading a 3D model + picking a
 * fabric is enough for that fabric to actually render on the model in the
 * viewer (see fabric-material.ts), with no separate "assign material" step.
 *
 * Returns [] (not an error) when there's no model, no fabric selected, or
 * the selected fabric has no reference photo yet — DesignTexture.imageUrl
 * is required, so an unphotographed catalog fabric just doesn't drive the
 * 3D material until the designer adds one. The version still saves fine.
 */
export function deriveFabricTextures(
  hasModel: boolean,
  fabricId: string | null | undefined,
  fabrics: FabricLibraryItemData[]
): DesignTextureInput[] {
  if (!hasModel || !fabricId) return [];
  const fabric = fabrics.find((f) => f.id === fabricId);
  if (!fabric?.imageUrl) return [];

  return [
    {
      role: "PRIMARY",
      name: fabric.name,
      imageUrl: fabric.imageUrl,
      colorHex: fabric.baseColorHex ?? undefined,
      materialType: fabric.texture ?? undefined,
      fabricLibraryItemId: fabric.id,
    },
  ];
}
