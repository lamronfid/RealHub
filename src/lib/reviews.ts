import { createClient } from './supabase/client';

export interface AgentReview {
  id: string;
  from_agent_id: string;
  to_agent_id: string;
  rating: number;
  comment: string;
  created_at: string;
  from_agent_name?: string;
  from_agent_avatar?: string | null;
}

// Predefined mock reviews to seed any agent profile by default
const MOCK_REVIEWERS = [
  { name: 'Sofía Benítez', avatar: null, agency: 'Génesis Inmobiliaria' },
  { name: 'Carlos Maidana', avatar: null, agency: 'Maidana Propiedades' },
  { name: 'María González', avatar: null, agency: 'Century 21 Paraguay' },
  { name: 'Julio Benítez', avatar: null, agency: 'Benítez & Asociados' }
];

const MOCK_COMMENTS = [
  'Excelente colega. Hicimos un cierre compartido de un departamento en Villa Morra y la comunicación fue impecable de inicio a fin. Muy transparente.',
  'Muy profesional y puntual en las visitas. Facilita mucho el trabajo en conjunto y respeta siempre los acuerdos de comisión 50/50.',
  'Responsable y proactivo. Responde rápido a los mensajes y tiene toda la documentación en orden al momento de la negociación.',
  'Excelente experiencia colaborando en el alquiler de un local comercial con un cliente muy demandante. Totalmente recomendado para futuros cierres.'
];

export function getMockReviews(toAgentId: string): AgentReview[] {
  // Generate stable mock reviews based on the agent's ID to keep it consistent
  const reviews: AgentReview[] = [];
  const count = 3; // Seed 3 reviews
  
  for (let i = 0; i < count; i++) {
    // Generate simple seed index from agent ID characters
    let seed = 0;
    for (let c = 0; c < toAgentId.length; c++) {
      seed += toAgentId.charCodeAt(c);
    }
    
    const reviewerIndex = (seed + i) % MOCK_REVIEWERS.length;
    const commentIndex = (seed * (i + 2)) % MOCK_COMMENTS.length;
    const rating = i === 1 ? 4 : 5; // e.g. 5, 4, 5 star reviews
    
    reviews.push({
      id: `mock-review-${toAgentId}-${i}`,
      from_agent_id: `mock-agent-${i}`,
      to_agent_id: toAgentId,
      rating,
      comment: MOCK_COMMENTS[commentIndex],
      created_at: new Date(Date.now() - (i + 1) * 2 * 24 * 60 * 60 * 1000).toISOString(), // 2, 4, 6 days ago
      from_agent_name: MOCK_REVIEWERS[reviewerIndex].name,
      from_agent_avatar: MOCK_REVIEWERS[reviewerIndex].avatar
    });
  }
  return reviews;
}

export async function getAgentReviews(toAgentId: string): Promise<AgentReview[]> {
  // Try to load from localStorage first for custom reviews
  let localReviews: AgentReview[] = [];
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem(`realhub_reviews_${toAgentId}`);
    if (stored) {
      try {
        localReviews = JSON.parse(stored);
      } catch (e) {
        console.error(e);
      }
    }
  }

  // Load from Supabase
  try {
    const supabase = createClient();
    
    // We fetch raw data and will try to resolve the profile
    const { data, error } = await supabase
      .from('agent_reviews')
      .select('*')
      .eq('to_agent_id', toAgentId);

    if (error) {
      console.warn('Could not fetch reviews from DB:', error.message);
      return [...localReviews, ...getMockReviews(toAgentId)];
    }

    if (!data || data.length === 0) {
      // If DB has no reviews, return mock + local reviews
      const mocks = getMockReviews(toAgentId);
      // Filter out mock reviews if they are already in localReviews
      const filteredMocks = mocks.filter(m => !localReviews.some(l => l.id === m.id));
      return [...localReviews, ...filteredMocks];
    }

    // Resolve author names for DB reviews
    const authorIds = data.map((r: any) => r.from_agent_id);
    const { data: profiles } = await supabase
      .from('agent_profiles')
      .select('id, full_name, avatar_url')
      .in('id', authorIds);

    const dbReviews: AgentReview[] = data.map((r: any) => {
      const profile = profiles?.find((p: any) => p.id === r.from_agent_id);
      return {
        id: r.id,
        from_agent_id: r.from_agent_id,
        to_agent_id: r.to_agent_id,
        rating: r.rating,
        comment: r.comment,
        created_at: r.created_at,
        from_agent_name: profile?.full_name || 'Colega Inmobiliario',
        from_agent_avatar: profile?.avatar_url || null
      };
    });

    // Merge and filter duplicates (by id)
    const all = [...localReviews, ...dbReviews];
    const unique = all.filter((v, i, a) => a.findIndex(t => t.id === v.id) === i);
    
    // Seed with mock reviews if we have few reviews
    if (unique.length < 3) {
      const mocks = getMockReviews(toAgentId);
      mocks.forEach(mock => {
        if (!unique.some(u => u.from_agent_name === mock.from_agent_name)) {
          unique.push(mock);
        }
      });
    }
    
    return unique;
  } catch (err) {
    console.warn('Error in getAgentReviews, returning local/mock:', err);
    return [...localReviews, ...getMockReviews(toAgentId)];
  }
}

export async function submitAgentReview(
  fromAgentId: string, 
  toAgentId: string, 
  rating: number, 
  comment: string,
  fromAgentName?: string
): Promise<boolean> {
  const newReview: AgentReview = {
    id: `local-rev-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    from_agent_id: fromAgentId,
    to_agent_id: toAgentId,
    rating,
    comment,
    created_at: new Date().toISOString(),
    from_agent_name: fromAgentName || 'Colega'
  };

  // 1. Save to local storage (immediate feedback on localhost)
  if (typeof window !== 'undefined') {
    const key = `realhub_reviews_${toAgentId}`;
    const stored = localStorage.getItem(key);
    let reviews: AgentReview[] = [];
    if (stored) {
      try { reviews = JSON.parse(stored); } catch (e) {}
    }
    reviews.unshift(newReview);
    localStorage.setItem(key, JSON.stringify(reviews));
  }

  // 2. Try to insert into database
  try {
    const supabase = createClient();
    const { error } = await supabase
      .from('agent_reviews')
      .insert({
        from_agent_id: fromAgentId,
        to_agent_id: toAgentId,
        rating,
        comment
      });
      
    if (error) {
      console.warn('DB review insert failed, using local storage only:', error.message);
      return true;
    }
    return true;
  } catch (err) {
    console.warn('DB review insert exception, using local storage only:', err);
    return true;
  }
}
