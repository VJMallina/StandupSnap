import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useAuth } from './AuthContext';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
const BACKEND_URL = API_URL.replace(/\/api$/, '');

export interface OrgBranding {
  logoUrl: string | null;
  brandPrimaryColor: string | null;
  brandSecondaryColor: string | null;
  brandAccentColor: string | null;
  brandFaviconUrl: string | null;
  orgName: string | null;
}

interface BrandingContextType {
  branding: OrgBranding;
  refreshBranding: () => Promise<void>;
}

const defaultBranding: OrgBranding = {
  logoUrl: null,
  brandPrimaryColor: null,
  brandSecondaryColor: null,
  brandAccentColor: null,
  brandFaviconUrl: null,
  orgName: null,
};

const BrandingContext = createContext<BrandingContextType>({
  branding: defaultBranding,
  refreshBranding: async () => {},
});

function applyBrandingToDOM(branding: OrgBranding) {
  const root = document.documentElement;
  if (branding.brandPrimaryColor) {
    root.style.setProperty('--brand-primary', branding.brandPrimaryColor);
  } else {
    root.style.removeProperty('--brand-primary');
  }
  if (branding.brandSecondaryColor) {
    root.style.setProperty('--brand-secondary', branding.brandSecondaryColor);
  } else {
    root.style.removeProperty('--brand-secondary');
  }
  if (branding.brandAccentColor) {
    root.style.setProperty('--brand-accent', branding.brandAccentColor);
  } else {
    root.style.removeProperty('--brand-accent');
  }

  // Update browser tab title
  document.title = branding.orgName
    ? `StandupSnap | ${branding.orgName}`
    : 'StandupSnap';

  // Update favicon dynamically
  if (branding.brandFaviconUrl) {
    let link = document.querySelector<HTMLLinkElement>("link[rel~='icon']");
    if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
      document.head.appendChild(link);
    }
    link.href = branding.brandFaviconUrl;
  }
}

export function BrandingProvider({ children }: { children: ReactNode }) {
  const { user, isAuthenticated } = useAuth();
  const [branding, setBranding] = useState<OrgBranding>(defaultBranding);

  const fetchBranding = async () => {
    const orgId = user?.organizationId;
    if (!orgId) return;

    try {
      const res = await fetch(`${API_URL}/organizations/${orgId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` },
      });
      if (!res.ok) return;
      const data = await res.json();
      const org = data.organization || data;

      const rawLogoUrl: string | null = org.logoUrl ?? null;
      const resolvedLogoUrl = rawLogoUrl?.startsWith('/')
        ? `${BACKEND_URL}${rawLogoUrl}`
        : rawLogoUrl;

      const loaded: OrgBranding = {
        logoUrl: resolvedLogoUrl ?? null,
        brandPrimaryColor: org.brandPrimaryColor ?? null,
        brandSecondaryColor: org.brandSecondaryColor ?? null,
        brandAccentColor: org.brandAccentColor ?? null,
        brandFaviconUrl: org.brandFaviconUrl ?? null,
        orgName: org.name ?? null,
      };

      setBranding(loaded);
      applyBrandingToDOM(loaded);
    } catch {
      // Non-fatal — fall back to defaults
    }
  };

  useEffect(() => {
    if (isAuthenticated && user?.organizationId) {
      fetchBranding();
    } else {
      setBranding(defaultBranding);
      applyBrandingToDOM(defaultBranding);
    }
  }, [isAuthenticated, user?.organizationId]);

  return (
    <BrandingContext.Provider value={{ branding, refreshBranding: fetchBranding }}>
      {children}
    </BrandingContext.Provider>
  );
}

export function useBranding() {
  return useContext(BrandingContext);
}
