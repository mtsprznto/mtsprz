/// <reference path="../.astro/types.d.ts" />
/// <reference types="astro/client" />

interface User {
  id: number;
  email: string;
  role: "client" | "super_admin";
}

declare namespace App {
  interface Locals {
    user?: User;
  }
}
