"use client";

import { Plus } from "lucide-react";
import { useState } from "react";
import type { BrandSlotPageData } from "@/application/slots/get-brand-slot-page";
import type { Role } from "@/domain/roles";
import type { SlotFormValues } from "./actions";
import { BookingBanner } from "../booking-banner";
import { AvailabilityCalendar } from "./availability-calendar";
import { BrandSummary } from "./brand-summary";
import { MySlots } from "./my-slots";
import { RoomHeatmap } from "./room-heatmap";
import { SlotDrawer } from "./slot-drawer";

interface Props {
  data: BrandSlotPageData;
  role: Role;
  userId: string;
  filters: { brand: string | null; status: string | null };
}

export function BrandSlotView({ data, role, userId, filters }: Props) {
  const [form, setForm] = useState<SlotFormValues | null>(null);
  const canBook = data.monthBooking.ok;

  function openNew(prefill: Partial<SlotFormValues> = {}) {
    setForm({
      date: data.day ?? (data.today.slice(0, 7) === data.month ? data.today : `${data.month}-01`),
      startMinute: 10 * 60,
      endMinute: 12 * 60,
      roomId: data.rooms[0]?.id ?? "",
      brandId: "",
      campaign: "",
      requirement: "",
      ...prefill,
    });
  }

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-4">
      <BookingBanner
        window={data.bannerWindow}
        open={data.bannerOpen}
        canEdit={role === "MANAGER"}
        today={data.today}
      />

      <div className="grid grid-cols-[minmax(0,1fr)] gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] content-start gap-4">
          <AvailabilityCalendar
            month={data.month}
            day={data.day}
            today={data.today}
            dayCounts={data.dayCounts}
          />
          {data.day && (
            <RoomHeatmap
              day={data.day}
              rooms={data.rooms}
              slots={data.daySlots}
              canBook={canBook}
              onPickFree={(roomId, startMinute) =>
                openNew({ date: data.day!, roomId, startMinute, endMinute: startMinute + 120 })
              }
            />
          )}
        </div>

        <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] content-start gap-4">
          <button
            type="button"
            onClick={() => openNew()}
            disabled={!canBook}
            title={canBook ? undefined : data.monthBooking.ok ? "" : data.monthBooking.reason}
            className="flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-[13px] font-semibold text-white shadow-[0_0_24px_rgba(18,104,255,0.3)] hover:bg-primary-hover disabled:cursor-not-allowed disabled:bg-line-strong disabled:text-muted disabled:shadow-none"
          >
            <Plus size={16} /> เพิ่ม Brand Slot
          </button>
          {!data.monthBooking.ok && (
            <p className="-mt-2 text-center text-[11px] text-waiting-fg">{data.monthBooking.reason}</p>
          )}
          <BrandSummary summary={data.brandSummary} mine={role === "AE"} />
          <MySlots
            slots={data.mySlots}
            limit={data.mySlotsLimit}
            brandNames={[...new Set(data.brands.map((b) => b.brandName))]}
            filters={filters}
            mine={role === "AE"}
            canEdit={(s) => canBook && s.status !== "completed" && (role === "MANAGER" || s.aeId === userId)}
            onEdit={(s) =>
              setForm({
                id: s.id,
                date: s.date,
                startMinute: s.startMinute,
                endMinute: s.endMinute,
                roomId: s.roomId,
                brandId: s.brandId,
                campaign: s.campaign,
                requirement: s.requirement,
              })
            }
          />
        </div>
      </div>

      {form && (
        <SlotDrawer
          key={form.id ?? "new"}
          initial={form}
          brands={data.brands}
          rooms={data.rooms}
          onClose={() => setForm(null)}
        />
      )}
    </div>
  );
}
