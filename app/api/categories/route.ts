import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/seed-data";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q") || "";
    const depthStr = searchParams.get("depth");
    const parentId = searchParams.get("parentId");
    const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit")) || 5));
    const offset = Math.max(0, Number(searchParams.get("offset")) || 0);

    const where: any = {};
    if (q) {
      where.OR = [
        { name: { contains: q, mode: "insensitive" } },
        { description: { contains: q, mode: "insensitive" } },
      ];
    }
    if (depthStr) {
      where.depth = Number(depthStr);
    }
    if (parentId !== null && parentId !== undefined) {
      where.parentId = parentId === "" || parentId === "null" ? null : parentId;
    }

    const [categories, total] = await Promise.all([
      prisma.category.findMany({
        where,
        orderBy: [{ depth: "asc" }, { orderIndex: "asc" }],
        take: limit,
        skip: offset,
      }),
      prisma.category.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      categories,
      total,
      limit,
      offset,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, slug, description, icon, parentId } = body;

    let depth = 1;
    if (parentId) {
      const parent = await prisma.category.findUnique({ where: { id: parentId } });
      if (!parent) {
        return NextResponse.json({ success: false, error: "Parent category does not exist" }, { status: 400 });
      }
      if (parent.depth >= 2) {
        return NextResponse.json(
          { success: false, error: "The system only supports up to 2 tier levels (Tier 1 > Tier 2)" },
          { status: 400 }
        );
      }
      depth = 2;
    }

    const maxOrder = await prisma.category.aggregate({
      where: { parentId: parentId || null },
      _max: { orderIndex: true },
    });
    const orderIndex = (maxOrder._max.orderIndex ?? 0) + 1;

    const finalSlug = slug || slugify(name);

    const category = await prisma.category.create({
      data: {
        name,
        slug: finalSlug,
        description: description || "",
        icon: icon || "Folder",
        depth,
        parentId: parentId || null,
        orderIndex,
        isPublished: true,
      },
    });

    return NextResponse.json({
      success: true,
      category: {
        ...category,
        parentId: category.parentId || "",
        createdAt: category.createdAt.toISOString(),
        updatedAt: category.updatedAt.toISOString(),
      },
    });
  } catch (error: any) {
    console.error("Error creating category in Postgres:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, ...patch } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: "Missing category ID" }, { status: 400 });
    }

    // Handle parentId transformation
    if (patch.parentId !== undefined) {
      patch.parentId = patch.parentId || null;
      if (patch.parentId) {
        const parent = await prisma.category.findUnique({ where: { id: patch.parentId } });
        if (parent && parent.depth >= 2) {
          return NextResponse.json(
            { success: false, error: "The system only supports up to 2 tier levels" },
            { status: 400 }
          );
        }
        patch.depth = 2;
      } else {
        patch.depth = 1;
      }
    }

    const updated = await prisma.category.update({
      where: { id },
      data: patch,
    });

    return NextResponse.json({
      success: true,
      category: {
        ...updated,
        parentId: updated.parentId || "",
        createdAt: updated.createdAt.toISOString(),
        updatedAt: updated.updatedAt.toISOString(),
      },
    });
  } catch (error: any) {
    console.error("Error updating category in Postgres:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const deleteArticles = searchParams.get("deleteArticles") === "true";
    const targetCategoryId = searchParams.get("targetCategoryId");

    if (!id) {
      return NextResponse.json({ success: false, error: "Missing category ID" }, { status: 400 });
    }

    // Find all category IDs in this branch (self + children)
    const children = await prisma.category.findMany({
      where: { parentId: id },
      select: { id: true },
    });
    const allBranchIds = [id, ...children.map((c) => c.id)];

    const articleCount = await prisma.article.count({
      where: { categoryId: { in: allBranchIds } },
    });

    if (articleCount > 0) {
      if (deleteArticles) {
        // Cascade delete all articles in this branch
        await prisma.article.deleteMany({
          where: { categoryId: { in: allBranchIds } },
        });
      } else if (targetCategoryId) {
        // Move all articles to the target category
        await prisma.article.updateMany({
          where: { categoryId: { in: allBranchIds } },
          data: { categoryId: targetCategoryId },
        });
      } else {
        // Block and ask user for confirmation
        return NextResponse.json(
          {
            success: false,
            requireConfirmation: true,
            articleCount,
            childCount: children.length,
            error: `This category contains ${articleCount} articles. Please confirm deletion or move articles to another category.`,
          },
          { status: 400 }
        );
      }
    }

    // Delete subcategories first if any
    if (children.length > 0) {
      await prisma.category.deleteMany({
        where: { parentId: id },
      });
    }

    // Delete the target category
    await prisma.category.delete({ where: { id } });

    return NextResponse.json({
      success: true,
      deletedId: id,
      deletedArticlesCount: deleteArticles ? articleCount : 0,
      reassignedArticlesCount: targetCategoryId ? articleCount : 0,
    });
  } catch (error: any) {
    console.error("Error deleting category in Postgres:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

