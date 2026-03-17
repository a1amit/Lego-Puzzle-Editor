import { create } from 'zustand';

export type EditorViewMode = 'split' | 'editor' | 'preview';

interface EditorViewStore {
  viewMode: EditorViewMode;
  isEditRoute: boolean;
  canEdit: boolean;
  setViewMode: (mode: EditorViewMode) => void;
  setIsEditRoute: (isEdit: boolean) => void;
  setCanEdit: (canEdit: boolean) => void;
}

export const useEditorViewStore = create<EditorViewStore>((set) => ({
  viewMode: 'preview',
  isEditRoute: false,
  canEdit: false,
  setViewMode: (viewMode) => set({ viewMode }),
  setIsEditRoute: (isEditRoute) => set({ isEditRoute }),
  setCanEdit: (canEdit) => set({ canEdit }),
}));
