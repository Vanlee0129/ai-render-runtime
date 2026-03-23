/**
 * AI Render Runtime - AI Adapter
 * AI API 适配器，支持多种后端
 */

import { AIConfig, AIResponse, SYSTEM_PROMPT } from './prompts';

export type AIProvider = 'minimax' | 'openai' | 'anthropic' | 'custom';

// MiniMax API 适配器
async function callMiniMax(config: AIConfig, userPrompt: string): Promise<AIResponse> {
  const { apiKey, apiUrl = 'https://api.minimaxi.com/v1/text/chatcompletion_v2', model = 'M2-her' } = config;

  try {
    const res = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', name: 'MiniMax AI' },
          { role: 'user', name: '系统', content: SYSTEM_PROMPT },
          { role: 'user', name: '用户', content: userPrompt }
        ]
      })
    });

    const data = await res.json();
    
    if (data.base_resp?.status_code !== 0) {
      return { content: '', error: data.base_resp?.status_msg || 'API 请求失败' };
    }

    return { content: data.choices?.[0]?.message?.content || '' };
  } catch (e: any) {
    return { content: '', error: e.message };
  }
}

// OpenAI API 适配器
async function callOpenAI(config: AIConfig, userPrompt: string): Promise<AIResponse> {
  const { apiKey, apiUrl = 'https://api.openai.com/v1/chat/completions', model = 'gpt-4' } = config;

  try {
    const res = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userPrompt }
        ]
      })
    });

    const data = await res.json();
    
    if (data.error) {
      return { content: '', error: data.error.message };
    }

    return { content: data.choices?.[0]?.message?.content || '' };
  } catch (e: any) {
    return { content: '', error: e.message };
  }
}

// 统一的 AI 调用接口
export async function callAI(
  provider: AIProvider,
  config: AIConfig,
  userPrompt: string
): Promise<AIResponse> {
  switch (provider) {
    case 'minimax':
      return callMiniMax(config, userPrompt);
    case 'openai':
      return callOpenAI(config, userPrompt);
    default:
      return { content: '', error: `不支持的 AI 提供商: ${provider}` };
  }
}

// 解析 AI 返回的 JSON
export function parseAIResponse(content: string): any {
  let jsonStr = content.trim();
  
  // 1. 尝试从 markdown 代码块提取
  const codeMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeMatch) {
    jsonStr = codeMatch[1].trim();
  } else {
    // 2. 尝试找到第一个 { 和最后一个 }
    const firstBrace = jsonStr.indexOf('{');
    const lastBrace = jsonStr.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1) {
      jsonStr = jsonStr.substring(firstBrace, lastBrace + 1);
    }
  }
  
  // 3. 尝试解析，如果失败则尝试更激进的提取
  try {
    return JSON.parse(jsonStr);
  } catch (e) {
    // 尝试提取第一个完整的JSON对象
    let depth = 0;
    let start = -1;
    for (let i = 0; i < jsonStr.length; i++) {
      if (jsonStr[i] === '{') {
        if (depth === 0) start = i;
        depth++;
      } else if (jsonStr[i] === '}') {
        depth--;
        if (depth === 0 && start !== -1) {
          return JSON.parse(jsonStr.substring(start, i + 1));
        }
      }
    }
    throw e;
  }
}
