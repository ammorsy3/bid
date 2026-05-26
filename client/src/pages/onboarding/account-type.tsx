import { useEffect } from "react";
import { useLocation } from "wouter";

export default function AccountTypeChoice() {
  const [, setLocation] = useLocation();
  useEffect(() => { setLocation("/onboarding"); }, [setLocation]);
  return null;
}
