import { ForegroundNotificationPayload } from "@/types";

type ForegroundNotificationPresenter = (payload: ForegroundNotificationPayload) => void;

let presenter: ForegroundNotificationPresenter | null = null;

export const registerForegroundNotificationPresenter = (
  nextPresenter: ForegroundNotificationPresenter
) => {
  presenter = nextPresenter;
};

export const unregisterForegroundNotificationPresenter = (
  nextPresenter: ForegroundNotificationPresenter
) => {
  if (presenter === nextPresenter) {
    presenter = null;
  }
};

export const showForegroundNotification = (payload: ForegroundNotificationPayload) => {
  if (!presenter) return false;
  presenter(payload);
  return true;
};
