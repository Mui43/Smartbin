"use client";

import { useEffect, useState, type FormEvent } from "react";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";

type PaginationControlsProps = {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  disabled?: boolean;
  totalItems?: number;
};

const buttonClass = "inline-flex h-9 items-center justify-center gap-1 rounded-xl border border-[#293548] bg-[#0a0d14] px-2 text-sm text-slate-300 transition hover:border-emerald-500/50 hover:bg-[#212b3d] hover:text-white disabled:cursor-not-allowed disabled:opacity-30 sm:px-3";

export default function PaginationControls({
  page,
  totalPages,
  onPageChange,
  disabled = false,
  totalItems,
}: PaginationControlsProps) {
  const lastPage = Math.max(1, totalPages);
  const currentPage = Math.min(Math.max(1, page), lastPage);
  const [draft, setDraft] = useState(String(currentPage));
  const [error, setError] = useState("");

  useEffect(() => {
    setDraft(String(currentPage));
    setError("");
  }, [currentPage, lastPage]);

  function goToPage(target: number) {
    if (disabled || target < 1 || target > lastPage || target === currentPage) return;
    setDraft(String(target));
    setError("");
    onPageChange(target);
  }

  function submitPage(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    if (disabled) return;
    const requested = Number(draft);
    if (!/^\d+$/.test(draft.trim()) || !Number.isSafeInteger(requested) || requested < 1 || requested > lastPage) {
      setError(`กรุณากรอกเลขหน้าระหว่าง 1–${lastPage}`);
      return;
    }
    setError("");
    goToPage(requested);
  }

  return (
    <nav aria-label="แบ่งหน้า" className="border-t border-[#212b3d] p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-between">
        {totalItems !== undefined && <span className="w-full text-center text-xs text-slate-400 sm:w-auto sm:text-left sm:text-sm">ทั้งหมด {totalItems} รายการ</span>}
        <div className="flex flex-wrap items-center justify-center gap-1.5 sm:gap-2">
          <button type="button" aria-label="หน้าแรก" title="หน้าแรก" className={buttonClass} disabled={disabled || currentPage <= 1} onClick={() => goToPage(1)}><ChevronsLeft size={16} /><span className="hidden md:inline">หน้าแรก</span></button>
          <button type="button" aria-label="หน้าก่อนหน้า" title="หน้าก่อนหน้า" className={buttonClass} disabled={disabled || currentPage <= 1} onClick={() => goToPage(currentPage - 1)}><ChevronLeft size={16} /><span className="hidden md:inline">ก่อนหน้า</span></button>
          <form noValidate onSubmit={submitPage} className="flex items-center gap-1.5 text-sm text-slate-400">
            <label htmlFor="pagination-page">หน้า</label>
            <input
              id="pagination-page"
              type="number"
              inputMode="numeric"
              min={1}
              max={lastPage}
              step={1}
              value={draft}
              disabled={disabled}
              onChange={(event) => { setDraft(event.target.value); setError(""); }}
              aria-label="กรอกเลขหน้าแล้วกด Enter"
              aria-invalid={Boolean(error)}
              className="h-9 w-16 rounded-xl border border-[#334155] bg-[#0a0d14] px-2 text-center text-sm text-white outline-none focus:border-emerald-500 disabled:opacity-50"
            />
            <span>/ {lastPage}</span>
          </form>
          <button type="button" aria-label="หน้าถัดไป" title="หน้าถัดไป" className={buttonClass} disabled={disabled || currentPage >= lastPage} onClick={() => goToPage(currentPage + 1)}><span className="hidden md:inline">ถัดไป</span><ChevronRight size={16} /></button>
          <button type="button" aria-label="หน้าสุดท้าย" title="หน้าสุดท้าย" className={buttonClass} disabled={disabled || currentPage >= lastPage} onClick={() => goToPage(lastPage)}><span className="hidden md:inline">หน้าสุดท้าย</span><ChevronsRight size={16} /></button>
        </div>
      </div>
      {error && <p role="alert" className="mt-2 text-center text-xs text-rose-400 sm:text-right">{error}</p>}
    </nav>
  );
}
