import { auth } from "@/lib/firebase";

const userStatus = auth.currentUser ? "authenticated" : "unauthenticated";
const userEmailStatus = () => {
  if (auth.currentUser) {
    return auth.currentUser?.emailVerified;
  } else {
    return null;
  }
};

export { userStatus, userEmailStatus };
