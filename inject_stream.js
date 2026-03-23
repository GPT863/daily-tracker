const fs = require('fs');
let js = fs.readFileSync('app.js', 'utf8');

// 1. callAiApi replacement
const newCallAiApi = `async function callAiApi(promptOrMessages, options = {}) {
    const config = options.config || aiConfig;
    const { provider, apiKey, model, apiEndpoint } = config;
    const systemPrompt = options.systemPrompt || '你是一位专业的健康顾问，擅长分析健康数据并提供个性化建议。';
    const messages = Array.isArray(promptOrMessages) ? promptOrMessages : [{ role: 'user', content: promptOrMessages }];

    let apiUrl = '';
    let headers = { 'Content-Type': 'application/json' };
    let body = {};

    switch (provider) {
        case 'openai':
        case 'deepseek':
        case 'tongyi':
        case 'custom':
            apiUrl = provider === 'openai' ? 'https://api.openai.com/v1/chat/completions' :
                     provider === 'deepseek' ? 'https://api.deepseek.com/v1/chat/completions' :
                     provider === 'tongyi' ? 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions' :
                     apiEndpoint;
            headers['Authorization'] = \`Bearer \${apiKey}\`;
            body = {
                model: model || (provider === 'openai' ? 'gpt-4o-mini' : provider === 'deepseek' ? 'deepseek-chat' : provider === 'tongyi' ? 'qwen-plus' : 'gpt-3.5-turbo'),
                messages: [{ role: 'system', content: systemPrompt }, ...messages],
                temperature: 0.7,
                max_tokens: 2000
            };
            if (options.onChunk) body.stream = true;
            break;

        case 'anthropic':
            apiUrl = 'https://api.anthropic.com/v1/messages';
            headers['x-api-key'] = apiKey;
            headers['anthropic-version'] = '2023-06-01';
            body = {
                model: model || 'claude-3-haiku-20240307',
                system: systemPrompt,
                max_tokens: 2000,
                messages: messages.map(message => ({ role: message.role === 'assistant' ? 'assistant' : 'user', content: message.content }))
            };
            if (options.onChunk) body.stream = true;
            break;

        default:
            throw new Error('不支持的AI服务提供商');
    }

    const response = await fetch(apiUrl, { method: 'POST', headers, body: JSON.stringify(body) });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(\`API请求失败 (\${response.status}): \${errorData.error?.message || response.statusText}\`);
    }

    if (options.onChunk && body.stream) {
        const reader = response.body.getReader();
        const decoder = new TextDecoder('utf-8');
        let fullText = '';
        let buffer = '';

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\\n');
            buffer = lines.pop(); // keep incomplete line
            
            for (const line of lines) {
                const trimmed = line.trim();
                if (!trimmed || trimmed === 'data: [DONE]') continue;
                if (trimmed.startsWith('data: ')) {
                    try {
                        const data = JSON.parse(trimmed.substring(6));
                        let chunk = '';
                        if (provider === 'anthropic') {
                            if (data.type === 'content_block_delta' && data.delta?.type === 'text_delta') {
                                chunk = data.delta.text || '';
                            }
                        } else {
                            chunk = data.choices[0]?.delta?.content || '';
                        }
                        if (chunk) {
                            fullText += chunk;
                            options.onChunk(chunk, fullText);
                        }
                    } catch(e) { }
                }
            }
        }
        return fullText;
    }

    const result = await response.json();
    if (provider === 'anthropic') return result.content[0].text;
    else return result.choices[0].message.content;
}`;

js = js.replace(/async function callAiApi.*?^\}/ms, newCallAiApi);

// 2. startAiDiagnosis 替换
js = js.replace(
  /\/\/\s*调用AI API\s*appendAiProcess\('running', '正在请求 AI 服务，请稍候。'\);\s*const response = await callAiApi\(prompt\);\s*markAiConfigVerified\(\);\s*appendAiProcess\('success', 'AI 服务已返回结果，正在整理展示内容。'\);\s*\/\/\s*显示结果\s*resultContent\.innerHTML = formatAiResponse\(response\);\s*resultSection\.classList\.remove\('hidden'\);/,
  \`// 调用AI API (支持流式输出)
        appendAiProcess('running', '正在请求 AI 服务并接收流式响应...');
        resultContent.innerHTML = '<span class="ai-cursor"></span>';
        resultSection.classList.remove('hidden');
        
        const response = await callAiApi(prompt, {
            onChunk: (chunk, fullText) => {
                resultContent.innerHTML = formatAiResponse(fullText) + '<span class="ai-cursor"></span>';
                const modalParams = document.querySelector('#aiDiagnosisModal .modal-content');
                if(modalParams) modalParams.scrollTop = modalParams.scrollHeight;
            }
        });
        
        resultContent.innerHTML = formatAiResponse(response);
        markAiConfigVerified();
        appendAiProcess('success', 'AI 分析完成。');\`
);

// 3. sendAiFollowup 替换
js = js.replace(
  /const response = await callAiApi\(messages, \{[\s\S]*?aiConversationHistory\.push\(\{ role: 'assistant', content: response \}\);/m,
  \`const assistantMessageIndex = aiConversationHistory.push({ role: 'assistant', content: '' }) - 1;
            renderAiConversation();
            
            const response = await callAiApi(messages, {
                systemPrompt: '你是一位专业、友好的健康顾问。请基于已有诊断结果继续回答用户追问，避免重复整份报告；保持中文表达清晰简洁；不要做医疗诊断结论，对于明显异常情况建议咨询专业医生。',
                onChunk: (chunk, fullText) => {
                    aiConversationHistory[assistantMessageIndex].content = fullText;
                    const container = document.getElementById('aiChatMessages');
                    if (container) {
                        const lastMsg = container.lastElementChild;
                        if (lastMsg) lastMsg.querySelector('.ai-chat-content').innerHTML = formatAiResponse(fullText) + '<span class="ai-cursor"></span>';
                        container.scrollTop = container.scrollHeight;
                    }
                }
            });
            aiConversationHistory[assistantMessageIndex].content = response;
            renderAiConversation();
            markAiConfigVerified();\`
);

fs.writeFileSync('app.js', js, 'utf8');
console.log('Stream injected');
