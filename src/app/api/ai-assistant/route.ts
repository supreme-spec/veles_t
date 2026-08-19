import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    const { message } = await req.json();

    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { reply: 'Пожалуйста, отправьте текст запроса.' },
        { status: 400 }
      );
    }

    const reply = `Спасибо за ваш вопрос! AI-ассистент временно недоступен. Для помощи свяжитесь с нашим менеджером по телефону +7 985 063-51-34 или в Telegram @Anastasiiiiyyaa.`;

    return NextResponse.json({ reply });
  } catch (error) {
    console.error('[AI ASSISTANT ERROR]', error);
    return NextResponse.json(
      { reply: 'Произошла ошибка. Попробуйте позже или свяжитесь с нашим менеджером.' },
      { status: 500 }
    );
  }
}
