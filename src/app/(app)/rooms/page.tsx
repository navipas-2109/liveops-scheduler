import { requirePage } from "@/app/require-page";
import { services } from "@/di/container";
import { RoomsView } from "./rooms-view";

export default async function RoomsPage() {
  await requirePage("roomDatabase");
  const rooms = await services.listRooms();
  return <RoomsView rooms={rooms} />;
}
