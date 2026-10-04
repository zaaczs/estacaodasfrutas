"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Eye, EyeOff, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { publishProductCategories } from "./categorySync";

type Category = {
  id: string;
  name: string;
  description: string | null;
  active: boolean;
  productCount: number;
  products: Array<{
    id: string;
    name: string;
    active: boolean;
  }>;
};

type Props = {
  canManage: boolean;
  canModify: boolean;
};

export function ProductCategoriesManager({ canManage, canModify }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [categoryToEdit, setCategoryToEdit] = useState<Category | null>(null);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editError, setEditError] = useState("");
  const [editing, setEditing] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteError, setDeleteError] = useState("");
  const [deleting, setDeleting] = useState(false);

  async function fetchCategories() {
    try {
      const res = await fetch("/api/product-categories");
      if (!res.ok) throw new Error("Erro ao carregar categorias");
      const data = (await res.json()) as Array<Partial<Category>>;
      const normalized: Category[] = data.map((item, idx) => {
        const products = Array.isArray(item.products) ? item.products : [];
        return {
          id: item.id ?? `cat-${idx}`,
          name: item.name ?? "Sem nome",
          description: item.description ?? null,
          active: item.active ?? true,
          productCount:
            typeof item.productCount === "number" ? item.productCount : products.length,
          products,
        };
      });
      setCategories(normalized);
      publishProductCategories(normalized.map((category) => category.name));
    } catch (e) {
      alert(e instanceof Error ? e.message : "Erro ao carregar categorias");
    }
  }

  useEffect(() => {
    if (open) void fetchCategories();
  }, [open]);

  async function createCategory(e: React.FormEvent) {
    e.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) {
      alert("Informe o nome da categoria.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/product-categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: trimmedName,
          description: description.trim() || undefined,
          active: true,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Erro ao criar categoria");
      }
      setName("");
      setDescription("");
      await fetchCategories();
      router.refresh();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Erro ao criar categoria");
    } finally {
      setLoading(false);
    }
  }

  async function patchCategory(
    id: string,
    payload: Partial<Pick<Category, "name" | "description" | "active">>
  ) {
    const res = await fetch(`/api/product-categories/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Erro ao atualizar categoria");
    }
    await fetchCategories();
    router.refresh();
  }

  async function handleToggleActive(category: Category) {
    setSavingId(category.id);
    try {
      await patchCategory(category.id, { active: !category.active });
    } catch (e) {
      alert(e instanceof Error ? e.message : "Erro ao alterar visibilidade");
    } finally {
      setSavingId(null);
    }
  }

  function openEditDialog(category: Category) {
    setCategoryToEdit(category);
    setEditName(category.name);
    setEditDescription(category.description ?? "");
    setEditError("");
  }

  function closeEditDialog() {
    if (editing) return;
    setCategoryToEdit(null);
    setEditError("");
  }

  async function confirmEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!categoryToEdit) return;
    const nextName = editName.trim();
    if (!nextName) {
      setEditError("Nome da categoria é obrigatório.");
      return;
    }

    setEditing(true);
    setEditError("");
    setSavingId(categoryToEdit.id);
    try {
      await patchCategory(categoryToEdit.id, {
        name: nextName,
        description: editDescription.trim(),
      });
      setCategoryToEdit(null);
    } catch (e) {
      setEditError(e instanceof Error ? e.message : "Erro ao editar categoria");
    } finally {
      setEditing(false);
      setSavingId(null);
    }
  }

  function openDeleteDialog(category: Category) {
    setCategoryToDelete(category);
    setDeletePassword("");
    setDeleteError("");
  }

  function closeDeleteDialog() {
    if (deleting) return;
    setCategoryToDelete(null);
    setDeletePassword("");
    setDeleteError("");
  }

  async function confirmDelete(e: React.FormEvent) {
    e.preventDefault();
    if (!categoryToDelete) return;
    if (!deletePassword) {
      setDeleteError("Informe a senha do login para excluir a categoria.");
      return;
    }

    setDeleting(true);
    setDeleteError("");
    setSavingId(categoryToDelete.id);
    try {
      const res = await fetch(`/api/product-categories/${categoryToDelete.id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: deletePassword }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Erro ao excluir categoria");
      }
      setCategoryToDelete(null);
      setDeletePassword("");
      await fetchCategories();
      router.refresh();
    } catch (e) {
      setDeleteError(e instanceof Error ? e.message : "Erro ao excluir categoria");
    } finally {
      setDeleting(false);
      setSavingId(null);
    }
  }

  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        Categorias
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Gerenciar categorias</DialogTitle>
            <p className="text-sm text-muted-foreground">
              {canManage
                ? "Veja, crie, edite, oculte e exclua categorias sem sair da tela."
                : "Veja, edite e exclua categorias sem sair da tela."}
            </p>
          </DialogHeader>

          <div className="space-y-4">
            {canManage && (
              <form
                onSubmit={createCategory}
                className="grid gap-3 md:grid-cols-[220px_minmax(0,1fr)_auto]"
              >
                <div>
                  <Label htmlFor="new-category-name">Nova categoria</Label>
                  <Input
                    id="new-category-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ex.: Hortaliças"
                  />
                </div>
                <div>
                  <Label htmlFor="new-category-description">Descrição</Label>
                  <Input
                    id="new-category-description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Texto que pode ser exibido para o cliente"
                  />
                </div>
                <Button type="submit" className="self-end" disabled={loading}>
                  <Plus className="mr-2 h-4 w-4" />
                  {loading ? "Criando..." : "Adicionar"}
                </Button>
              </form>
            )}

            <div className="max-h-[55vh] overflow-auto rounded-lg border">
              <div className="grid grid-cols-[minmax(0,1fr)_150px] gap-2 border-b bg-muted/30 px-3 py-2 text-xs font-medium text-muted-foreground">
                <span>Categoria</span>
                <span>Ações</span>
              </div>
              {categories.length === 0 && (
                <p className="p-4 text-sm text-muted-foreground">Nenhuma categoria cadastrada.</p>
              )}
              {categories.map((category) => (
                (() => {
                  const products = Array.isArray(category.products) ? category.products : [];
                  return (
                <div
                  key={category.id}
                  className="grid grid-cols-[minmax(0,1fr)_150px] items-center gap-2 border-b px-3 py-3 last:border-b-0"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="truncate font-medium">{category.name}</p>
                      <Badge variant={category.active ? "success" : "secondary"}>
                        {category.active ? "Ativa" : "Inativa"}
                      </Badge>
                      <Badge variant="outline">
                        {typeof category.productCount === "number"
                          ? category.productCount
                          : products.length}{" "}
                        produto(s)
                      </Badge>
                    </div>
                    <p className="truncate text-xs text-muted-foreground">
                      {category.description?.trim() || "Sem descrição"}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      Produtos:{" "}
                      {products.length > 0
                        ? products.map((p) => p.name).join(", ")
                        : "nenhum produto vinculado"}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    {canManage && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleToggleActive(category)}
                        title={category.active ? "Ocultar categoria" : "Mostrar categoria"}
                        disabled={savingId === category.id}
                      >
                        {savingId === category.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : category.active ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openEditDialog(category)}
                      title="Editar categoria"
                      disabled={!canModify || savingId === category.id}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openDeleteDialog(category)}
                      title="Excluir categoria"
                      className="text-destructive hover:text-destructive"
                      disabled={!canModify || savingId === category.id}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                  );
                })()
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={categoryToEdit != null}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) closeEditDialog();
        }}
      >
        <DialogContent className="z-[60] sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Editar categoria</DialogTitle>
            <DialogDescription>
              Altere o nome e a descrição. Os produtos vinculados passam a usar o novo nome.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={confirmEdit} className="space-y-4">
            <div>
              <Label htmlFor="edit-category-name">Nome</Label>
              <Input
                id="edit-category-name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                autoFocus
                disabled={editing}
              />
            </div>
            <div>
              <Label htmlFor="edit-category-description">Descrição</Label>
              <Input
                id="edit-category-description"
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                placeholder="Texto que pode ser exibido para o cliente"
                disabled={editing}
              />
            </div>
            {editError && (
              <p className="text-sm text-destructive" role="alert">
                {editError}
              </p>
            )}
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={closeEditDialog}
                disabled={editing}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={editing}>
                {editing ? "Salvando..." : "Salvar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={categoryToDelete != null}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) closeDeleteDialog();
        }}
      >
        <DialogContent className="z-[60] sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Excluir categoria</DialogTitle>
            <DialogDescription>
              Confirme com a senha do seu login para apagar
              {categoryToDelete ? ` "${categoryToDelete.name}"` : " esta categoria"}.
              Os produtos dessa categoria, os itens de pedido e as movimentações
              de estoque também serão apagados.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={confirmDelete} className="space-y-4">
            <div>
              <Label htmlFor="delete-category-password">Senha do login</Label>
              <Input
                id="delete-category-password"
                type="password"
                autoComplete="current-password"
                value={deletePassword}
                onChange={(e) => setDeletePassword(e.target.value)}
                placeholder="Digite sua senha"
                autoFocus
                disabled={deleting}
              />
            </div>
            {deleteError && (
              <p className="text-sm text-destructive" role="alert">
                {deleteError}
              </p>
            )}
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={closeDeleteDialog}
                disabled={deleting}
              >
                Cancelar
              </Button>
              <Button type="submit" variant="destructive" disabled={deleting}>
                {deleting ? "Excluindo..." : "Excluir categoria"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

