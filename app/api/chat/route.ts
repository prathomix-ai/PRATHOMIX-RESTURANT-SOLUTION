import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import Groq from 'groq-sdk';
import { supabase } from '@/lib/supabase';

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
  'mixtral-8x7b-32768',
].filter(Boolean) as string[];

// ═══════════════════════════════════════════════════════════════
//  TOOL EXECUTOR  — runs the actual Supabase queries / inserts
// ═══════════════════════════════════════════════════════════════
async function executeTool(name: string, args: Record<string, unknown>) {
  const toNumber = (value: unknown) => {
    if (value === undefined || value === null || value === '') return undefined;
    const numericValue = typeof value === 'number' ? value : Number(value);
    return Number.isFinite(numericValue) ? numericValue : undefined;
  };

  if (name === 'search_dishes') {
    let q = supabase.from('dishes').select('*').eq('available', true);
    const minProtein  = toNumber(args.min_protein);
    const maxCalories = toNumber(args.max_calories);
    const maxProtein  = toNumber(args.max_protein);

    if (minProtein !== undefined)  q = q.gte('protein',  minProtein);
    if (maxCalories !== undefined) q = q.lte('calories', maxCalories);
    if (maxProtein !== undefined)  q = q.lte('protein',  maxProtein);
    if (args.category)     q = q.eq('category',  args.category     as string);
    if (args.query)        q = q.ilike('name',   `%${args.query}%`);
    q = q.limit(6);
    const { data, error } = await q;
    return { dishes: data ?? [], error: error?.message };
  }

  if (name === 'book_table') {
    const { data, error } = await supabase
      .from('bookings')
      .insert({
        customer_name: args.customer_name,
        phone:         args.phone,
        date:          args.date,
        time:          args.time,
        guests:        Number(args.guests),
        notes:         args.notes ?? '',
      })
      .select()
      .single();
    return { booking: data, error: error?.message };
  }

  if (name === 'get_menu') {
    const { data } = await supabase
      .from('dishes')
      .select('name, price, calories, protein, category')
      .eq('available', true)
      .limit(20);
    return { dishes: data ?? [] };
  }

  return {};
}

// ═══════════════════════════════════════════════════════════════
//  TOOL SCHEMAS
// ═══════════════════════════════════════════════════════════════
const GEMINI_TOOLS = [
  {
    functionDeclarations: [
      {
        name:        'search_dishes',
        description: 'Search and filter dishes by nutrition macros or name. Always use this when a user asks about protein, calories, or specific dietary goals.',
        parameters: {
          type: 'OBJECT',
          properties: {
            query:        { type: 'STRING', description: 'Dish name keyword to search' },
            min_protein:  { type: 'STRING', description: 'Minimum protein in grams' },
            max_calories: { type: 'STRING', description: 'Maximum calorie count' },
            max_protein:  { type: 'STRING', description: 'Maximum protein in grams' },
            category:     { type: 'STRING', description: 'Category filter: High Protein | Low Cal | Vegetarian | Main' },
          },
        },
      },
      {
        name:        'book_table',
        description: 'Book a restaurant table after collecting all required details.',
        parameters: {
          type:     'OBJECT',
          required: ['customer_name', 'phone', 'date', 'time', 'guests'],
          properties: {
            customer_name: { type: 'STRING', description: "Customer's full name" },
            phone:         { type: 'STRING', description: 'Phone number with country code' },
            date:          { type: 'STRING', description: 'Reservation date in YYYY-MM-DD format' },
            time:          { type: 'STRING', description: 'Reservation time in HH:MM 24-hour format' },
            guests:        { type: 'STRING', description: 'Number of guests (1-20)' },
            notes:         { type: 'STRING', description: 'Any special requests or notes' },
          },
        },
      },
      {
        name:        'get_menu',
        description: 'Retrieve a list of all available menu items with names, prices, and macros.',
        parameters: { type: 'OBJECT', properties: {} },
      },
    ],
  },
];

const GROQ_TOOLS = [
  {
    type: 'function' as const,
    function: {
      name:        'search_dishes',
      description: 'Search and filter dishes by nutrition macros or name',
      parameters: {
        type: 'object',
        properties: {
          query:        { type: 'string' },
            min_protein:  { type: 'string' },
            max_calories: { type: 'string' },
            max_protein:  { type: 'string' },
          category:     { type: 'string' },
        },
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name:        'book_table',
      description: 'Book a restaurant table',
      parameters: {
        type:     'object',
        required: ['customer_name', 'phone', 'date', 'time', 'guests'],
        properties: {
          customer_name: { type: 'string' },
          phone:         { type: 'string' },
          date:          { type: 'string' },
          time:          { type: 'string' },
          guests:        { type: 'string' },
          notes:         { type: 'string' },
        },
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name:        'get_menu',
      description: 'Get the full menu',
      parameters:  { type: 'object', properties: {} },
    },
  },
];

const SYSTEM_PROMPT = `You are Priya, the warm and knowledgeable AI dining assistant for Prathomix Restaurant in Jaipur.

You help guests with:
1. Finding dishes matching their macro/calorie goals — ALWAYS call search_dishes when asked about protein, calories, dietary restrictions, or specific nutrition.
2. Table bookings — collect: customer name → phone → date (YYYY-MM-DD) → time (HH:MM) → guests, one at a time.
3. Menu questions — call get_menu for a complete overview.
4. Food & nutrition advice.

Style: concise, friendly, enthusiastic about food. Use emojis sparingly.
Restaurant details: Open 12:00–23:00 daily · Mi Road, Jaipur · +91-98765-43210
When showing dishes, briefly highlight the top 1-2 results after the tool renders the cards.`;

// ═══════════════════════════════════════════════════════════════
//  MAIN HANDLER
// ═══════════════════════════════════════════════════════════════
export async function POST(req: Request) {
  const { messages } = await req.json() as { messages: Array<{ role: string; content: string }> };
  const sanitizedMessages = [...messages];

  while (sanitizedMessages.length && sanitizedMessages[0].role !== 'user') {
    sanitizedMessages.shift();
  }

  if (!sanitizedMessages.length) {
    return NextResponse.json({
      message: 'Please send a message to start the conversation.',
      toolResult: null,
      provider: 'error',
    });
  }

  // ── PRIMARY: Gemini 1.5 Flash ──────────────────────────────
  try {
    if (!process.env.GEMINI_API_KEY) throw new Error('GEMINI_API_KEY not set');

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    // Build Gemini history (all messages except the last)
    const history = sanitizedMessages.slice(0, -1).map((m) => ({
      role:  m.role === 'user' ? 'user' : 'model',
      parts: [{ text: m.content }],
    }));
    const lastMsg = sanitizedMessages[sanitizedMessages.length - 1];

    let geminiLastError: Error | null = null;

    for (const geminiModel of GEMINI_MODELS) {
      try {
        const model = genAI.getGenerativeModel({
          model:             geminiModel,
          systemInstruction: SYSTEM_PROMPT,
          tools:             GEMINI_TOOLS as any,
        });

        const chat     = model.startChat({ history });
        let   response = await chat.sendMessage(lastMsg.content);
        let   result   = response.response;

        let toolResult: any = null;
        let loopCount  = 0;

        while (result.functionCalls()?.length && loopCount < 4) {
          loopCount++;
          const call     = result.functionCalls()![0];
          const toolData = await executeTool(call.name, call.args as Record<string, unknown>);

          // Capture first actionable tool result for Generative UI
          if (!toolResult) {
            if (call.name === 'search_dishes' && (toolData as any).dishes?.length) {
              toolResult = { type: 'dishes', data: (toolData as any).dishes };
            } else if (call.name === 'book_table' && (toolData as any).booking) {
              toolResult = { type: 'booking', data: (toolData as any).booking };
            } else if (call.name === 'get_menu' && (toolData as any).dishes?.length) {
              toolResult = { type: 'dishes', data: (toolData as any).dishes };
            }
          }

          response = await chat.sendMessage([{
            functionResponse: { name: call.name, response: toolData },
          }]);
          result = response.response;
        }

        return NextResponse.json({
          message:    result.text() || 'Here are my recommendations for you!',
          toolResult,
          provider:  'gemini',
          model:     geminiModel,
        });
      } catch (err) {
        geminiLastError = err as Error;
        console.warn(`[Chat] Gemini model failed (${geminiModel}):`, geminiLastError.message);
      }
    }

    throw geminiLastError ?? new Error('All Gemini models failed');

  } catch (geminiError) {
    console.warn('[Chat] Gemini failed, switching to Groq fallback:', (geminiError as Error).message);

    // ── FALLBACK: Groq llama3-70b ────────────────────────────
    try {
      if (!process.env.GROQ_API_KEY) throw new Error('GROQ_API_KEY not set');

      const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

      const groqMessages: any[] = [
        { role: 'system',    content: SYSTEM_PROMPT },
        ...sanitizedMessages.map((m) => ({ role: m.role, content: m.content })),
      ];

      let groqLastError: Error | null = null;

      for (const groqModel of GROQ_MODELS) {
        try {
          const runMessages = [...groqMessages];
          let completion = await groq.chat.completions.create({
            model:       groqModel,
            messages:    runMessages,
            tools:       GROQ_TOOLS,
            tool_choice: 'auto',
            max_tokens:  1024,
          });

          let   choice    = completion.choices[0];
          let   toolResult: any = null;
          let   loopCount = 0;

          while (choice.finish_reason === 'tool_calls' && choice.message.tool_calls?.length && loopCount < 4) {
            loopCount++;
            const toolCall = choice.message.tool_calls[0];
            const args     = JSON.parse(toolCall.function.arguments || '{}') as Record<string, unknown>;
            const toolData = await executeTool(toolCall.function.name, args);

            if (!toolResult) {
              if (toolCall.function.name === 'search_dishes' && (toolData as any).dishes?.length) {
                toolResult = { type: 'dishes', data: (toolData as any).dishes };
              } else if (toolCall.function.name === 'book_table' && (toolData as any).booking) {
                toolResult = { type: 'booking', data: (toolData as any).booking };
              } else if (toolCall.function.name === 'get_menu' && (toolData as any).dishes?.length) {
                toolResult = { type: 'dishes', data: (toolData as any).dishes };
              }
            }

            runMessages.push(choice.message);
            runMessages.push({
              role:         'tool',
              tool_call_id: toolCall.id,
              content:      JSON.stringify(toolData),
            });

            completion = await groq.chat.completions.create({
              model: groqModel, messages: runMessages,
              tools: GROQ_TOOLS, tool_choice: 'auto', max_tokens: 1024,
            });
            choice = completion.choices[0];
          }

          return NextResponse.json({
            message:    choice.message.content || 'Here are some great options!',
            toolResult,
            provider:  'groq',
            model:     groqModel,
          });
        } catch (err) {
          groqLastError = err as Error;
          console.warn(`[Chat] Groq model failed (${groqModel}):`, groqLastError.message);
        }
      }

      throw groqLastError ?? new Error('All Groq models failed');

    } catch (groqError) {
      console.error('[Chat] Both AI providers failed:', groqError);
      return NextResponse.json({
        message:    "I'm having trouble connecting right now 😔 Please try again in a moment, or call us at +91-98765-43210!",
        toolResult: null,
        provider:  'error',
      });
    }
  }
}
