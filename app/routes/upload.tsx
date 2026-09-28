import { AppLayout } from "@/components/layout/AppLayout";
import { UploadPage } from "@/components/upload/UploadPage";

export default function UploadPageRoute() {
  return (
    <AppLayout showAlert={false}>
      <UploadPage />
    </AppLayout>
  );
}
