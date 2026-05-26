/**
 * Book Service — CRUD + listing for the Books / Documents module.
 *
 * Permissions:
 *   - Create: ADMIN or INSTRUCTOR (the actor becomes Book.createdBy).
 *   - Update/Delete: only the original createdBy or an ADMIN.
 *   - List: public (PUBLISHED only) unless an ADMIN/owner is requesting.
 */
import { prisma } from "@/lib/prisma";
import type { BookFileFormat, ContentStatus, Prisma } from "@prisma/client";

export interface BookListOpts {
  q?:           string;
  categoryId?:  string;
  page?:        number;
  pageSize?:    number;
  status?:      ContentStatus;
  createdById?: string;
}

export async function listBooks(opts: BookListOpts = {}) {
  const page     = Math.max(1, opts.page ?? 1);
  const pageSize = Math.min(50, Math.max(1, opts.pageSize ?? 12));

  const where: Prisma.BookWhereInput = {};
  if (opts.status)      where.status = opts.status;
  if (opts.categoryId)  where.categoryId = opts.categoryId;
  if (opts.createdById) where.createdById = opts.createdById;
  if (opts.q) {
    where.OR = [
      { title:       { contains: opts.q, mode: "insensitive" } },
      { description: { contains: opts.q, mode: "insensitive" } },
      { author:      { contains: opts.q, mode: "insensitive" } },
    ];
  }

  const [items, total] = await Promise.all([
    prisma.book.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip:    (page - 1) * pageSize,
      take:    pageSize,
      include: {
        category:  { select: { id: true, name: true, slug: true } },
        createdBy: { select: { id: true, name: true, avatar: true } },
        _count:    { select: { purchases: true, reviews: true } },
      },
    }),
    prisma.book.count({ where }),
  ]);

  return { items, total, page, pageSize, pages: Math.ceil(total / pageSize) };
}

export async function getBookBySlug(slug: string) {
  return prisma.book.findUnique({
    where:   { slug },
    include: {
      category:  { select: { id: true, name: true, slug: true } },
      createdBy: { select: { id: true, name: true, avatar: true, bio: true } },
      reviews: {
        orderBy: { createdAt: "desc" },
        take:    20,
        include: { user: { select: { id: true, name: true, avatar: true } } },
      },
      _count: { select: { purchases: true, reviews: true } },
    },
  });
}

export async function getBookById(id: string) {
  return prisma.book.findUnique({
    where:   { id },
    include: {
      category:  { select: { id: true, name: true, slug: true } },
      createdBy: { select: { id: true, name: true } },
    },
  });
}

export interface BookCreateInput {
  title:           string;
  slug:            string;
  description:     string;
  shortDesc?:      string | null;
  coverImage?:     string | null;
  previewVideo?:   string | null;
  author:          string;
  pageCount?:      number | null;
  language?:       string;
  fileFormat:      BookFileFormat;
  fileUrl:         string;
  filePublicId:    string;
  fileSize:        number;
  price?:          number | null;
  discountPrice?:  number | null;
  isFree?:         boolean;
  status?:         ContentStatus;
  instructorRevenuePercent?: number;
  categoryId?:     string | null;
  organizationId?: string | null;
}

export async function createBook(
  data: BookCreateInput,
  actorUserId: string,
) {
  return prisma.book.create({
    data: {
      ...data,
      createdById: actorUserId,
      isFree:      data.isFree ?? false,
      language:    data.language ?? "English",
      status:      data.status ?? "DRAFT",
      instructorRevenuePercent: data.instructorRevenuePercent ?? 70,
    },
  });
}

export async function updateBook(
  id: string,
  data: Partial<BookCreateInput>,
  actor: { userId: string; role: "STUDENT" | "INSTRUCTOR" | "ADMIN" },
) {
  const book = await prisma.book.findUnique({
    where:  { id },
    select: { createdById: true },
  });
  if (!book) throw new Error("Book not found");
  if (book.createdById !== actor.userId && actor.role !== "ADMIN") {
    throw new Error("Forbidden");
  }
  return prisma.book.update({ where: { id }, data });
}

export async function deleteBook(
  id: string,
  actor: { userId: string; role: "STUDENT" | "INSTRUCTOR" | "ADMIN" },
) {
  const book = await prisma.book.findUnique({
    where:  { id },
    select: { createdById: true, _count: { select: { purchases: true } } },
  });
  if (!book) throw new Error("Book not found");
  if (book.createdById !== actor.userId && actor.role !== "ADMIN") {
    throw new Error("Forbidden");
  }
  if (book._count.purchases > 0) {
    throw new Error("Cannot delete a book that has been purchased. Archive it instead.");
  }
  return prisma.book.delete({ where: { id } });
}
