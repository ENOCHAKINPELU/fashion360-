import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ensureDefaultDesignCategories } from "@/lib/design-categories";
import { DesignGalleryClient } from "@/features/design-gallery/components/design-gallery-client";
import { CollectionsClient } from "@/features/design-gallery/components/collections-client";
import { ColorLibraryClient } from "@/features/design-gallery/components/color-library-client";
import { FabricLibraryClient } from "@/features/design-gallery/components/fabric-library-client";
import { CategoryManager } from "@/features/design-gallery/components/category-manager";

// Previously a bare placeholder despite every component this page needs
// already existing under src/features/design-gallery — this just wires
// them up. Server-fetches each tab's initial list; every tab's own client
// component owns its own create/edit/delete calls against the existing
// /api/designs/* routes (already implemented, never had a page to be
// called from).
export default async function DesignGalleryPage() {
  const session = await auth();
  const businessId = session!.user.businessId!;

  await ensureDefaultDesignCategories(prisma, businessId);

  const [categories, collections, colors, fabrics] = await Promise.all([
    prisma.designCategory.findMany({
      where: { businessId },
      orderBy: [{ isSystem: "desc" }, { name: "asc" }],
      include: { _count: { select: { designs: true } } },
    }),
    prisma.designCollection.findMany({
      where: { businessId },
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { designs: true } } },
    }),
    prisma.colorLibraryItem.findMany({ where: { businessId }, orderBy: { name: "asc" } }),
    prisma.fabricLibraryItem.findMany({ where: { businessId }, orderBy: { name: "asc" } }),
  ]);

  const serialized = JSON.parse(JSON.stringify({ categories, collections, colors, fabrics }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Design Gallery</h1>
        <p className="text-sm text-muted-foreground">Your digital catalogue of designs, collections, colours, and fabrics.</p>
      </div>

      <Tabs defaultValue="designs">
        <div className="overflow-x-auto scrollbar-thin">
          <TabsList>
            <TabsTrigger value="designs">Designs</TabsTrigger>
            <TabsTrigger value="collections">Collections</TabsTrigger>
            <TabsTrigger value="colors">Colour Library</TabsTrigger>
            <TabsTrigger value="fabrics">Fabric Library</TabsTrigger>
            <TabsTrigger value="categories">Categories</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="designs">
          <DesignGalleryClient categories={serialized.categories} collections={serialized.collections} />
        </TabsContent>

        <TabsContent value="collections">
          <CollectionsClient collections={serialized.collections} />
        </TabsContent>

        <TabsContent value="colors">
          <ColorLibraryClient colors={serialized.colors} />
        </TabsContent>

        <TabsContent value="fabrics">
          <FabricLibraryClient fabrics={serialized.fabrics} />
        </TabsContent>

        <TabsContent value="categories">
          <CategoryManager categories={serialized.categories} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
