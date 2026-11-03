import { requirePage } from "@/app/require-page";
import { services } from "@/di/container";
import { RoomsView } from "./rooms-view";

export default async function RoomsPage() {
  await requirePage("roomDatabase");
  const [rooms, buildings] = await Promise.all([services.listRooms(), services.listBuildings()]);
  return <RoomsView rooms={rooms} buildings={buildings} />;
}
