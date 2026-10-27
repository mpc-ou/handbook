import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const departments = await prisma.department.findMany({
      orderBy: { name: "asc" },
    });
    return NextResponse.json({ success: true, departments });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, description, color } = body;

    if (!name || !name.trim()) {
      return NextResponse.json(
        { success: false, error: "Department name cannot be empty." },
        { status: 400 }
      );
    }

    const trimmedName = name.trim();
    const existing = await prisma.department.findUnique({
      where: { name: trimmedName },
    });

    if (existing) {
      return NextResponse.json(
        { success: false, error: "This department already exists." },
        { status: 400 }
      );
    }

    const created = await prisma.department.create({
      data: {
        name: trimmedName,
        description: description?.trim() || null,
        color: color || "#f97316",
      },
    });

    return NextResponse.json({ success: true, department: created });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const { id, name, description, color } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: "Missing department ID to edit." },
        { status: 400 }
      );
    }

    if (!name || !name.trim()) {
      return NextResponse.json(
        { success: false, error: "Department name cannot be empty." },
        { status: 400 }
      );
    }

    const trimmedName = name.trim();
    const current = await prisma.department.findUnique({
      where: { id },
    });

    if (!current) {
      return NextResponse.json(
        { success: false, error: "Department not found to edit." },
        { status: 404 }
      );
    }

    // Check conflict if name changed
    if (current.name !== trimmedName) {
      const conflict = await prisma.department.findUnique({
        where: { name: trimmedName },
      });
      if (conflict) {
        return NextResponse.json(
          { success: false, error: "New department name already in use." },
          { status: 400 }
        );
      }
    }

    const updated = await prisma.department.update({
      where: { id },
      data: {
        name: trimmedName,
        description: description?.trim() || null,
        color: color || "#f97316",
      },
    });

    // If name changed, update user department references
    if (current.name !== trimmedName) {
      await prisma.user.updateMany({
        where: { department: current.name },
        data: { department: trimmedName },
      });
    }

    return NextResponse.json({ success: true, department: updated });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { success: false, error: "Missing department ID to delete." },
        { status: 400 }
      );
    }

    const dept = await prisma.department.findUnique({
      where: { id },
    });

    if (!dept) {
      return NextResponse.json(
        { success: false, error: "Department not found to delete." },
        { status: 404 }
      );
    }

    await prisma.department.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

