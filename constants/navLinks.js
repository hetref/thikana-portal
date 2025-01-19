import { Home, Bell, User, Plus } from "lucide-react";

export const authenticatedItems = [
  {
    title: "Home",
    icon: Home,
    href: "/feed",
  },
  {
    title: "Notifications",
    icon: Bell,
    href: "/notifications",
  },
  {
    title: "Profile",
    icon: User,
    href: "/profile",
  },
  {
    title: "Create",
    icon: Plus,
    href: "/create",
  },
];

export const unauthenticatedItems = [
  {
    title: "Home",
    href: "/",
  },
  {
    title: "Pricing",
    href: "/pricing",
  },
  {
    title: "Contact Us",
    href: "/contact",
  },
];
