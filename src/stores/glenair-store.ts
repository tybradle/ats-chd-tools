import { create } from 'zustand';
import { glenair } from '@/lib/db/client';
import type { 
  WireSystem, 
  GlenairContact, 
  GlenairArrangement, 
  GlenairBuilderResult 
} from '@/types/glenair';

interface GlenairBuilderState {
  step: number;
  wireSystem: WireSystem;
  wireValue: string;
  conductorCount: number;
  availableContactSizes: string[];
  contactSize: string | null;
  availableContacts: GlenairContact[];
  selectedContacts: GlenairContact[];
  availableArrangements: GlenairArrangement[];
  arrangement: string | null;
  shellStyle: string | null;
  loading: boolean;
  error: string | null;
  result: GlenairBuilderResult | null;
}

interface GlenairStore extends GlenairBuilderState {
  setWireSelection: (system: WireSystem, value: string, count: number) => Promise<void>;
  setContactSize: (size: string) => Promise<void>;
  toggleContact: (contact: GlenairContact) => void;
  setArrangement: (arrangement: string) => void;
  setShellStyle: (style: string) => void;
  reset: () => void;
  buildPart: () => void;
}

const initialState: GlenairBuilderState = {
  step: 1,
  wireSystem: 'AWG',
  wireValue: '',
  conductorCount: 1,
  availableContactSizes: [],
  contactSize: null,
  availableContacts: [],
  selectedContacts: [],
  availableArrangements: [],
  arrangement: null,
  shellStyle: null,
  loading: false,
  error: null,
  result: null,
};

export const useGlenairStore = create<GlenairStore>((set, get) => ({
  ...initialState,

  setWireSelection: async (system, value, count) => {
    set({ loading: true, wireSystem: system, wireValue: value, conductorCount: count });
    try {
      const sizes = await glenair.getCompatibleContactSizes(value, system);
      set({ 
        availableContactSizes: sizes.map(s => s.contact_size),
        loading: false,
        step: 2 
      });
    } catch (err) {
      set({ error: (err as Error).message, loading: false });
    }
  },

  setContactSize: async (size) => {
    set({ loading: true, contactSize: size });
    try {
      const contacts = await glenair.getContactsBySize(size);
      const arrangements = await glenair.getArrangementsByContactCount(get().conductorCount, size);
      set({ 
        availableContacts: contacts,
        availableArrangements: arrangements,
        loading: false,
        step: 3
      });
    } catch (err) {
      set({ error: (err as Error).message, loading: false });
    }
  },

  toggleContact: (contact) => {
    const { selectedContacts } = get();
    const exists = selectedContacts.some(c => c.part_number === contact.part_number);
    set({
      selectedContacts: exists 
        ? selectedContacts.filter(c => c.part_number !== contact.part_number)
        : [...selectedContacts, contact]
    });
  },

  setArrangement: (arrangement) => set({ arrangement, step: 4 }),
  
  setShellStyle: (style) => set({ shellStyle: style, step: 5 }),

  reset: () => set(initialState),

  buildPart: () => {
    const { shellStyle, arrangement, selectedContacts, wireSystem, wireValue } = get();
    if (!shellStyle || !arrangement || selectedContacts.length === 0) return;
    
    // Improved PN generation logic
    // Structure: 80[shellStyle]-[arrangement]-[contactCode]
    // contactCode depends on the selected contact. Usually M for pin, S for socket.
    // The suffix often denotes contact size or specific plating.
    
    const contact = selectedContacts[0];
    const contactTypeLetter = contact.type === 'Pin' ? 'P' : 'S';
    
    // Extract a suffix from the Glenair contact part number if it follows the 10-xxx-xx format
    // e.g. 10-375-20 -> suffix 20
    const pnParts = contact.part_number.split('-');
    const suffix = pnParts.length > 1 ? pnParts[pnParts.length - 1].replace(/[*]/g, '') : 'A';

    const partNumber = `80${shellStyle}-${arrangement}-${contactTypeLetter}${suffix}`;
    
    set({ 
      result: { 
        partNumber, 
        description: `Glenair Series 80 Connector - Shell Style ${shellStyle}, Arrangement ${arrangement}, ${contact.type} Contacts`,
        metadata: {
          wireSize: wireValue,
          wireSystem: wireSystem,
          contactPN: contact.part_number
        } 
      },
      step: 6 
    });
  },
}));
