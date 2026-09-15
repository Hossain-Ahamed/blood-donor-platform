"use client";
import { usePushNotifications } from "@/hooks/use-push-notifications";
import { Button } from "@/components/ui/button";
import { LanguageSwitcher } from "@/components/language-switcher";
import { useTranslations } from "next-intl";

export default function ProfilePage() {
  const { isSupported, isSubscribed, loading, subscribeToPush } =
    usePushNotifications();
  const t = useTranslations("Profile");

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <LanguageSwitcher />
      </div>

      <div className="mt-8 p-4 border rounded shadow-sm">
        <h2 className="text-lg font-semibold mb-2">{t("notifications")}</h2>
        {!isSupported ? (
          <p className="text-sm text-gray-500">{t("notSupported")}</p>
        ) : loading ? (
          <p className="text-sm text-gray-500">{t("loading")}</p>
        ) : isSubscribed ? (
          <p className="text-sm text-green-600 font-medium">
            {t("subscribed")}
          </p>
        ) : (
          <div>
            <p className="text-sm text-gray-500 mb-2">{t("enablePrompt")}</p>
            <Button onClick={subscribeToPush}>{t("enableButton")}</Button>
          </div>
        )}
      </div>
    </div>
  );
}
