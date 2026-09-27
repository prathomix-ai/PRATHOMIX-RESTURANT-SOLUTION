import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import Groq from 'groq-sdk';
import { RESTAURANT_SEED_DISHES, RESTAURANT_TABLES, supabase, DEFAULT_RESTAURANT_ID } from '@/lib/supabase';
import { ensureRestaurantDishesSeeded } from '@/lib/restaurantSeed';
import { checkRateLimit, getClientIp } from '@/lib/rateLimit';

export const dynamic = 'force-dynamic';

function withTimeout<T>(promise: Promise<T>, timeoutMs = 8000): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`AI provider request timed out after ${timeoutMs}ms`)), timeoutMs)
    ),
  ]);
}

const GEMINI_MODELS = [
  process.env.GEMINI_MODEL,
  'gemini-2.0-flash',
  'gemini-1.5-flash-latest',
  'gemini-1.5-flash',
].filter(Boolean) as string[];

const GROQ_MODELS = [
  process.env.GROQ_MODEL,
  'llama-3.3-70b-versatile',
  'llama-3.1-8b-instant',
].filter(Boolean) as string[];

// ═══════════════════════════════════════════════════════════════
//  ROLE-BASED SYSTEM PROMPTS & BOUNDARIES
// ═══════════════════════════════════════════════════════════════
const ROLE_SYSTEM_PROMPTS: Record<string, string> = {
  customer: `You are Mix, the warm, luxury dining concierge for PRATHOMIX Flagship Luxury Lounge.
You assist patrons with:
1. Finding dishes matching dietary goals (high protein, low calorie, vegetarian, keto). Always call search_dishes.
2. Culinary pairings (wine, mocktails, appetizers).
3. Table reservations — collect name, phone, date (YYYY-MM-DD), time (HH:MM), guest count.
4. Menu questions — call get_menu for dish details.
Style: Warm, hospitable, refined, concise. Open 11:00-23:30 daily · Mumbai Financial District · +91-98765-43210.`,

  admin: `You are Aether Executive, the senior operations copilot for PRATHOMIX OS.
You assist restaurant owners, managers, and directors with:
1. Real-time revenue insights, gross sales, and average ticket size (call get_daily_sales).
2. Critical inventory stockout alerts and ingredient reorder thresholds (call get_inventory_alerts).
3. Dining room table occupancy and turn-rate statistics (call get_table_status).
Style: Crisp, data-driven, strategic, and concise. Provide actionable recommendations.`,

  owner: `You are Aether Executive, the senior operations copilot for PRATHOMIX OS.
You assist restaurant owners, managers, and directors with:
1. Real-time revenue insights, gross sales, and average ticket size (call get_daily_sales).
2. Critical inventory stockout alerts and ingredient reorder thresholds (call get_inventory_alerts).
3. Dining room table occupancy and turn-rate statistics (call get_table_status).
Style: Crisp, data-driven, strategic, and concise. Provide actionable recommendations.`,

  waiter: `You are Server Co-Pilot for the PRATHOMIX Dining Room.
You advise waitstaff on:
1. Upselling recommendations and beverage pairings for popular entrees.
2. Food allergies and dietary restrictions (gluten-free, dairy-free, nut allergies, Jain options).
3. Current table occupancy and seating status (call get_table_status).
4. Menu dish ingredients and flavor profiles (call search_dishes or get_menu).
Style: Practical, fast-paced, focused on guest delight and table turnaround.`,

  chef: `You are Chef's Sous-AI for the PRATHOMIX Culinary Kitchen.
You assist kitchen brigade chefs with:
1. Checking ingredient stock levels and low-stock alerts before prep (call get_inventory_alerts).
2. Dish ingredient specifications and culinary modifiers (extra spicy, low salt, allergy modifications).
3. Expediting high-rush ticket workflows and station prep timing.
Style: Professional kitchen jargon, safety-first, direct and efficient.`,

  receptionist: `You are Front Desk Orchestrator for PRATHOMIX Reception.
You help front desk hosts with:
1. Live table availability, seating capacities, and section allocation (call get_table_status).
2. Managing VIP guest bookings and reservations (call book_table).
Style: Courteous, calm, focused on floor balance and VIP hospitality.`,
};

// ═══════════════════════════════════════════════════════════════
//  TOOL EXECUTOR
// ═══════════════════════════════════════════════════════════════
async function executeTool(name: string, args: Record<string, unknown>) {
  const toNumber = (value: unknown) => {
    if (value === undefined || value === null || value === '') return undefined;
    const numericValue = typeof value === 'number' ? value : Number(value);
    return Number.isFinite(numericValue) ? numericValue : undefined;
  };

  if (name === 'search_dishes') {
    await ensureRestaurantDishesSeeded();
    let q = supabase.from(RESTAURANT_TABLES.dishes).select('*').eq('available', true);
    const minProtein = toNumber(args.min_protein);
    const maxCalories = toNumber(args.max_calories);
    const maxProtein = toNumber(args.max_protein);

    if (minProtein !== undefined) q = q.gte('protein', minProtein);
    if (maxCalories !== undefined) q = q.lte('calories', maxCalories);
    if (maxProtein !== undefined) q = q.lte('protein', maxProtein);
    if (args.category) q = q.eq('category', args.category as string);
    if (args.query) q = q.ilike('name', `%${args.query}%`);
    q = q.limit(6);
    const { data, error } = await q;
    return { dishes: data ?? [], error: error?.message };
  }

  if (name === 'book_table') {
    const { data, error } = await supabase
      .from(RESTAURANT_TABLES.bookings)
      .insert({
        customer_name: args.customer_name,
        phone: args.phone,
        date: args.date,
        time: args.time,
        guests: Number(args.guests),
        notes: args.notes ?? '',
      })
      .select()
      .single();
    return { booking: data, error: error?.message };
  }

  if (name === 'get_menu') {
    await ensureRestaurantDishesSeeded();
    const { data } = await supabase
      .from(RESTAURANT_TABLES.dishes)
      .select('name, price, calories, protein, category')
      .eq('available', true)
      .limit(20);
    return { dishes: data ?? [] };
  }

  if (name === 'get_inventory_alerts') {
    return {
      alerts: [
        { name: 'Organic Paneer', stock: '3.2 kg', min: '8.0 kg', status: 'CRITICAL_LOW' },
        { name: 'Fresh Hass Avocados', stock: '1.5 kg', min: '6.0 kg', status: 'CRITICAL_LOW' },
        { name: 'Saffron Threads', stock: '45 gm', min: '100 gm', status: 'REORDER_WARNING' },
      ],
      totalLowStockCount: 3,
    };
  }

  if (name === 'get_daily_sales') {
    return {
      todayGrossSales: 34500,
      netRevenue: 32775,
      ordersExecuted: 28,
      topDish: 'Grilled Chicken Powerhouse',
      activeChannel: 'Dine-In (64%)',
    };
  }

  if (name === 'get_table_status') {
    return {
      totalTables: 10,
      occupiedTables: 4,
      availableTables: 6,
      currentOccupancyRate: '40%',
      openVIPBooth: 'Table 9 & Table 10',
    };
  }

  return {};
}

// ═══════════════════════════════════════════════════════════════
//  FALLBACK RULE ENGINE FOR ALL ROLES
// ═══════════════════════════════════════════════════════════════
async function buildRoleAwareLocalResponse(message: string, role: string) {
  const text = message.toLowerCase();

  // 1. Role: Admin / Owner
  if (role === 'admin' || role === 'owner') {
    if (text.includes('sale') || text.includes('revenue') || text.includes('income') || text.includes('profit')) {
      const sales = await executeTool('get_daily_sales', {});
      return {
        message: `Today's gross revenue stands at ₹${(sales as any).todayGrossSales?.toLocaleString('en-IN')}, with 28 completed tickets and an average ticket size of ₹1,230. Top-selling item: Grilled Chicken Powerhouse.`,
        toolResult: { type: 'metrics', data: sales },
      };
    }
    if (text.includes('inventory') || text.includes('stock') || text.includes('shortage') || text.includes('alert')) {
      const inv = await executeTool('get_inventory_alerts', {});
      return {
        message: `Attention: 3 ingredients have fallen below safety thresholds — Organic Paneer (3.2 kg remaining, min 8 kg), Hass Avocados (1.5 kg, min 6 kg), and Kashmiri Saffron. Immediate purchase order recommended.`,
        toolResult: { type: 'inventory', data: inv },
      };
    }
    if (text.includes('table') || text.includes('occupancy') || text.includes('floor')) {
      const tbl = await executeTool('get_table_status', {});
      return {
        message: `Current dining room occupancy is at 40% (4 tables occupied, 6 available). VIP Lounges Table 9 & 10 are currently open for seating.`,
        toolResult: { type: 'tables', data: tbl },
      };
    }
  }

  // 2. Role: Chef
  if (role === 'chef') {
    if (text.includes('substitute') || text.includes('replace') || text.includes('paneer') || text.includes('chicken')) {
      return {
        message: `Chef, for paneer shortages you can substitute with extra-firm pressed tofu or halloumi. For grilled chicken, turkey breast or marinated tempeh can match the 45g protein spec.`,
        toolResult: null,
      };
    }
    if (text.includes('stock') || text.includes('inventory')) {
      const inv = await executeTool('get_inventory_alerts', {});
      return {
        message: `Chef, note that Organic Paneer and Hass Avocados are low. Suggest featuring the Salmon Teriyaki or Powerhouse Salad for tonight's specials.`,
        toolResult: { type: 'inventory', data: inv },
      };
    }
  }

  // 3. Role: Waiter
  if (role === 'waiter') {
    if (text.includes('pair') || text.includes('wine') || text.includes('recommend')) {
      return {
        message: `Server Co-Pilot: Recommend pairing the Salmon Teriyaki with a dry Pinot Grigio or chilled jasmine green tea. For the Butter Chicken, suggest garlic butter naan and a full-bodied Cabernet.`,
        toolResult: null,
      };
    }
    if (text.includes('allergy') || text.includes('gluten') || text.includes('jain') || text.includes('dairy')) {
      return {
        message: `Allergen Guide: The Zucchini Pasta Primavera and Grilled Chicken are 100% gluten-free. For Jain patrons, use the 'No Onion / No Garlic' modifier on Dal Makhani or Paneer Tikka.`,
        toolResult: null,
      };
    }
  }

  // 4. Default: Customer Dining Concierge
  const calorieMatch = text.match(/(\d+)\s*(?:cal|calorie|calories)/i);
  const proteinMatch = text.match(/(\d+)\s*(?:g\s*)?(?:protein|prot)/i);

  if (text.includes('high protein') || text.includes('protein') || text.includes('gym')) {
    const dishes = RESTAURANT_SEED_DISHES.filter((d) => d.protein >= 30).slice(0, 4);
    return {
      message: `For your high-protein goals, I recommend our Grilled Chicken Powerhouse (45g protein) and Salmon Teriyaki (42g protein). Both are prepared fresh to order.`,
      toolResult: { type: 'dishes', data: dishes },
    };
  }

  if (text.includes('low cal') || text.includes('calorie') || text.includes('light')) {
    const dishes = RESTAURANT_SEED_DISHES.filter((d) => d.calories <= 320).slice(0, 4);
    return {
      message: `Here are our exquisite low-calorie options: Zucchini Pasta Primavera (220 cal) and Masala Egg White Omelette (180 cal). Light, satisfying, and nutrient-dense.`,
      toolResult: { type: 'dishes', data: dishes },
    };
  }

  if (text.includes('book') || text.includes('reserve') || text.includes('table')) {
    return {
      message: `I'd be honored to arrange your reservation at PRATHOMIX Flagship. Please share your name, phone number, desired date (YYYY-MM-DD), time, and guest count.`,
      toolResult: null,
    };
  }

  // General menu overview
  const featured = RESTAURANT_SEED_DISHES.slice(0, 4);
  return {
    message: `Welcome to PRATHOMIX Flagship Lounge. Explore our signature dishes below or tell me if you have any nutritional goals or dietary preferences!`,
    toolResult: { type: 'dishes', data: featured },
  };
}

// ═══════════════════════════════════════════════════════════════
//  TOOL SCHEMAS
// ═══════════════════════════════════════════════════════════════
const GEMINI_TOOLS = [
  {
    functionDeclarations: [
      {
        name: 'search_dishes',
        description: 'Search and filter dishes by nutrition macros or name.',
        parameters: {
          type: 'OBJECT',
          properties: {
            query: { type: 'STRING', description: 'Dish name keyword to search' },
            min_protein: { type: 'STRING', description: 'Minimum protein in grams' },
            max_calories: { type: 'STRING', description: 'Maximum calorie count' },
            max_protein: { type: 'STRING', description: 'Maximum protein in grams' },
            category: { type: 'STRING', description: 'Category: High Protein | Low Cal | Vegetarian | Main' },
          },
        },
      },
      {
        name: 'book_table',
        description: 'Book a restaurant table after collecting customer details.',
        parameters: {
          type: 'OBJECT',
          required: ['customer_name', 'phone', 'date', 'time', 'guests'],
          properties: {
            customer_name: { type: 'STRING', description: "Customer's full name" },
            phone: { type: 'STRING', description: 'Phone number' },
            date: { type: 'STRING', description: 'Reservation date YYYY-MM-DD' },
            time: { type: 'STRING', description: 'Reservation time HH:MM' },
            guests: { type: 'STRING', description: 'Number of guests (1-20)' },
            notes: { type: 'STRING', description: 'Special requests' },
          },
        },
      },
      {
        name: 'get_menu',
        description: 'Retrieve all available menu items.',
        parameters: { type: 'OBJECT', properties: {} },
      },
      {
        name: 'get_inventory_alerts',
        description: 'Check low-stock ingredients and reorder warnings.',
        parameters: { type: 'OBJECT', properties: {} },
      },
      {
        name: 'get_daily_sales',
        description: 'Retrieve gross sales, ticket count, and top-selling dishes.',
        parameters: { type: 'OBJECT', properties: {} },
      },
      {
        name: 'get_table_status',
        description: 'Check dining room occupancy rate and available table count.',
        parameters: { type: 'OBJECT', properties: {} },
      },
    ],
  },
];

const GROQ_TOOLS = [
  {
    type: 'function' as const,
    function: {
      name: 'search_dishes',
      description: 'Search dishes by macros or name',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string' },
          min_protein: { type: 'string' },
          max_calories: { type: 'string' },
          category: { type: 'string' },
        },
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'book_table',
      description: 'Book a restaurant table',
      parameters: {
        type: 'object',
        required: ['customer_name', 'phone', 'date', 'time', 'guests'],
        properties: {
          customer_name: { type: 'string' },
          phone: { type: 'string' },
          date: { type: 'string' },
          time: { type: 'string' },
          guests: { type: 'string' },
        },
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'get_menu',
      description: 'Get the full menu',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'get_inventory_alerts',
      description: 'Get low stock inventory items',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'get_daily_sales',
      description: 'Get daily sales and revenue stats',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'get_table_status',
      description: 'Get table floor occupancy',
      parameters: { type: 'object', properties: {} },
    },
  },
];

// ═══════════════════════════════════════════════════════════════
//  MAIN HANDLER
// ═══════════════════════════════════════════════════════════════
export async function POST(req: Request) {
  const ip = getClientIp(req);
  const rateCheck = checkRateLimit(ip, 'chat');

  const body = (await req.json()) as {
    messages?: Array<{ role: string; content: string }>;
    role?: string;
    stream?: boolean;
  };

  const rawMessages = body.messages || [];
  const activeRole = body.role || 'customer';
  const systemPrompt = ROLE_SYSTEM_PROMPTS[activeRole] || ROLE_SYSTEM_PROMPTS.customer;
  const isStreamRequested = body.stream === true || req.headers.get('accept')?.includes('text/event-stream');

  const sanitizedMessages = [...rawMessages];
  while (sanitizedMessages.length && sanitizedMessages[0].role !== 'user') {
    sanitizedMessages.shift();
  }

  if (!sanitizedMessages.length) {
    return NextResponse.json({
      message: 'Please send a message to start the consultation.',
      toolResult: null,
      provider: 'error',
    });
  }

  // Bounded conversation history (max 8 messages) to protect memory & context window
  const boundedMessages = sanitizedMessages.slice(-8);

  // Maximum message size protection (cap user query at 1,000 characters)
  const rawLastMessage = boundedMessages[boundedMessages.length - 1]?.content ?? '';
  const lastUserMessage = rawLastMessage.slice(0, 1000);
  boundedMessages[boundedMessages.length - 1].content = lastUserMessage;

  // Rate limit protection: return polite concierge response without hard-crashing
  if (!rateCheck.success) {
    if (isStreamRequested) {
      return new Response(
        `data: ${JSON.stringify({ type: 'chunk', text: 'Mix Concierge is experiencing high inquiry traffic. Please allow a moment before sending another query.' })}\n\ndata: ${JSON.stringify({ type: 'done', provider: 'rate-limit' })}\n\n`,
        {
          headers: {
            'Content-Type': 'text/event-stream; charset=utf-8',
            'Retry-After': rateCheck.retryAfterHeader || '60',
          },
        }
      );
    }
    const local = await buildRoleAwareLocalResponse(lastUserMessage, activeRole);
    return NextResponse.json({
      message: `${local.message}\n\n*(High concurrent traffic detected — instant local dining intelligence provided.)*`,
      toolResult: local.toolResult,
      provider: 'local-intelligent-engine',
    });
  }

  // Helper to execute generation logic
  async function generateChatResponse(): Promise<{
    message: string;
    toolResult: any;
    provider: string;
    model?: string;
  }> {
    // 1. If keys are missing, run high-intelligence local rule engine directly
    if (!process.env.GEMINI_API_KEY && !process.env.GROQ_API_KEY) {
      const local = await buildRoleAwareLocalResponse(lastUserMessage, activeRole);
      return {
        message: local.message,
        toolResult: local.toolResult,
        provider: 'local-intelligent-engine',
      };
    }

    // 2. Primary: Gemini
    try {
      if (!process.env.GEMINI_API_KEY) throw new Error('GEMINI_API_KEY not set');

      const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
      const history = boundedMessages.slice(0, -1).map((m) => ({
        role: m.role === 'user' ? 'user' : 'model',
        parts: [{ text: m.content }],
      }));
      const lastMsg = boundedMessages[boundedMessages.length - 1];

      let geminiLastError: Error | null = null;

      for (const geminiModel of GEMINI_MODELS) {
        try {
          if (req.signal.aborted) break;

          const model = genAI.getGenerativeModel({
            model: geminiModel,
            systemInstruction: systemPrompt,
            tools: GEMINI_TOOLS as any,
          });

          const chat = model.startChat({ history });
          let response = await withTimeout(chat.sendMessage(lastMsg.content), 8000);
          let result = response.response;

          let toolResult: any = null;
          let loopCount = 0;

          while (result.functionCalls()?.length && loopCount < 4 && !req.signal.aborted) {
            loopCount++;
            const call = result.functionCalls()![0];
            const toolData = await executeTool(call.name, call.args as Record<string, unknown>);

            if (!toolResult) {
              if (call.name === 'search_dishes' && (toolData as any).dishes?.length) {
                toolResult = { type: 'dishes', data: (toolData as any).dishes };
              } else if (call.name === 'book_table' && (toolData as any).booking) {
                toolResult = { type: 'booking', data: (toolData as any).booking };
              } else if (call.name === 'get_menu' && (toolData as any).dishes?.length) {
                toolResult = { type: 'dishes', data: (toolData as any).dishes };
              } else if (call.name === 'get_inventory_alerts') {
                toolResult = { type: 'inventory', data: toolData };
              } else if (call.name === 'get_daily_sales') {
                toolResult = { type: 'metrics', data: toolData };
              } else if (call.name === 'get_table_status') {
                toolResult = { type: 'tables', data: toolData };
              }
            }

            response = await withTimeout(
              chat.sendMessage([{ functionResponse: { name: call.name, response: toolData } }]),
              8000
            );
            result = response.response;
          }

          return {
            message: result.text() || 'Here are the operational details for you.',
            toolResult: toolResult ?? (await buildRoleAwareLocalResponse(lastUserMessage, activeRole)).toolResult,
            provider: 'gemini',
            model: geminiModel,
          };
        } catch (err) {
          geminiLastError = err as Error;
          console.warn(`[Chat] Gemini model failed (${geminiModel}):`, geminiLastError.message);
        }
      }

      throw geminiLastError ?? new Error('All Gemini models failed');
    } catch (geminiError) {
      console.warn('[Chat] Gemini failed, switching to Groq fallback:', (geminiError as Error).message);

      // 3. Fallback: Groq
      try {
        if (!process.env.GROQ_API_KEY) throw new Error('GROQ_API_KEY not set');

        const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
        const groqMessages: any[] = [
          { role: 'system', content: systemPrompt },
          ...boundedMessages.map((m) => ({ role: m.role, content: m.content })),
        ];

        let groqLastError: Error | null = null;

        for (const groqModel of GROQ_MODELS) {
          try {
            if (req.signal.aborted) break;

            const runMessages = [...groqMessages];
            let completion = await withTimeout(
              groq.chat.completions.create({
                model: groqModel,
                messages: runMessages,
                tools: GROQ_TOOLS,
                tool_choice: 'auto',
                max_tokens: 1024,
              }),
              8000
            );

            let choice = completion.choices[0];
            let toolResult: any = null;
            let loopCount = 0;

            while (
              choice.finish_reason === 'tool_calls' &&
              choice.message.tool_calls?.length &&
              loopCount < 4 &&
              !req.signal.aborted
            ) {
              loopCount++;
              const toolCall = choice.message.tool_calls[0];
              const args = JSON.parse(toolCall.function.arguments || '{}') as Record<string, unknown>;
              const toolData = await executeTool(toolCall.function.name, args);

              if (!toolResult) {
                if (toolCall.function.name === 'search_dishes' && (toolData as any).dishes?.length) {
                  toolResult = { type: 'dishes', data: (toolData as any).dishes };
                } else if (toolCall.function.name === 'book_table' && (toolData as any).booking) {
                  toolResult = { type: 'booking', data: (toolData as any).booking };
                } else if (toolCall.function.name === 'get_menu' && (toolData as any).dishes?.length) {
                  toolResult = { type: 'dishes', data: (toolData as any).dishes };
                } else if (toolCall.function.name === 'get_inventory_alerts') {
                  toolResult = { type: 'inventory', data: toolData };
                } else if (toolCall.function.name === 'get_daily_sales') {
                  toolResult = { type: 'metrics', data: toolData };
                } else if (toolCall.function.name === 'get_table_status') {
                  toolResult = { type: 'tables', data: toolData };
                }
              }

              runMessages.push(choice.message);
              runMessages.push({
                role: 'tool',
                tool_call_id: toolCall.id,
                content: JSON.stringify(toolData),
              });

              completion = await withTimeout(
                groq.chat.completions.create({
                  model: groqModel,
                  messages: runMessages,
                  tools: GROQ_TOOLS,
                  tool_choice: 'auto',
                  max_tokens: 1024,
                }),
                8000
              );
              choice = completion.choices[0];
            }

            return {
              message: choice.message.content || 'Here are the details for you.',
              toolResult: toolResult ?? (await buildRoleAwareLocalResponse(lastUserMessage, activeRole)).toolResult,
              provider: 'groq',
              model: groqModel,
            };
          } catch (err) {
            groqLastError = err as Error;
            console.warn(`[Chat] Groq model failed (${groqModel}):`, groqLastError.message);
          }
        }

        throw groqLastError ?? new Error('All Groq models failed');
      } catch (groqError) {
        console.error('[Chat] Both AI providers failed, using local engine:', groqError);
        const local = await buildRoleAwareLocalResponse(lastUserMessage, activeRole);
        return {
          message: local.message,
          toolResult: local.toolResult,
          provider: 'local-intelligent-engine',
        };
      }
    }
  }

  // If streaming is requested, stream response with live abort cancellation
  if (isStreamRequested) {
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        try {
          const generated = await generateChatResponse();

          if (req.signal.aborted) {
            controller.close();
            return;
          }

          // 1. Send tool result if available
          if (generated.toolResult) {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ type: 'tool', toolResult: generated.toolResult })}\n\n`)
            );
          }

          // 2. Stream tokens/chunks smoothly
          const text = generated.message || '';
          const words = text.split(' ');

          for (let i = 0; i < words.length; i++) {
            if (req.signal.aborted) {
              controller.close();
              return;
            }

            const chunk = (i === 0 ? '' : ' ') + words[i];
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ type: 'chunk', text: chunk })}\n\n`)
            );

            // Small natural pacing for streaming experience
            await new Promise((resolve) => setTimeout(resolve, 25));
          }

          // 3. Send done
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: 'done', provider: generated.provider })}\n\n`)
          );
          controller.close();
        } catch (streamError) {
          if (!req.signal.aborted) {
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({
                  type: 'chunk',
                  text: 'Sorry, I encountered an issue completing your request. Please try again.',
                })}\n\n`
              )
            );
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'done' })}\n\n`));
          }
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
      },
    });
  }

  // Non-streaming JSON fallback
  const result = await generateChatResponse();
  return NextResponse.json({
    message: result.message,
    toolResult: result.toolResult,
    provider: result.provider,
    model: result.model,
  });
}

