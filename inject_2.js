const fs = require('fs');
let js = fs.readFileSync('app.js', 'utf8');

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
            headers['Authorization'] = "Bearer " + apiKey;
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
        throw new Error("API请求失败 (" + response.status + "): " + (errorData.error?.message || response.statusText));
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
            
            for (let line of lines) {
                line = line.trim();
                if (!line || line === 'data: [DONE]') continue;
                if (line.startsWith('data: ')) {
                    try {
                        const data = JSON.parse(line.substring(6));
                        let chunk = '';
                        if (provider === 'anthropic') {
                            if (data.type === 'content_block_delta' && data.delta && data.delta.type === 'text_delta') {
                                chunk = data.delta.text || '';
                            }
                        } else {
                            if (data.choices && data.choices[0] && data.choices[0].delta) {
                                chunk = data.choices[0].delta.content || '';
                            }
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

const newStart = "        // 调用AI API (支持流式输出)\\n" +
"        appendAiProcess('running', '正在请求 AI 服务并接收流式响应...');\\n" +
"        resultContent.innerHTML = '<span class=\"ai-cursor\"></span>';\\n" +
"        resultSection.classList.remove('hidden');\\n" +
"        \\n" +
"        const response = await callAiApi(prompt, {\\n" +
"            onChunk: (chunk, fullText) => {\\n" +
"                resultContent.innerHTML = formatAiResponse(fullText) + '<span class=\"ai-cursor\"></span>';\\n" +
"                const modalParams = document.querySelector('#aiDiagnosisModal .modal-content');\\n" +
"                if(modalParams) modalParams.scrollTop = modalParams.scrollHeight;\\n" +
"            }\\n" +
"        });\\n" +
"        \\n" +
"        resultContent.innerHTML = formatAiResponse(response);\\n" +
"        markAiConfigVerified();\\n" +
"        appendAiProcess('success', 'AI 服务分析完成。');";

js = js.replace(/\/\/\s*调用AI API\s*appendAiProcess\('running', '正在请求 AI 服务，请稍候。'\);\s*const response = await callAiApi\(prompt\);\s*markAiConfigVerified\(\);\s*appendAiProcess\('success', 'AI 服务已返回结果，正在整理展示内容。'\);\s*\/\/\s*显示结果\s*resultContent\.innerHTML = formatAiResponse\(response\);\s*resultSection\.classList\.remove\('hidden'\);/, newStart);

const newFollowup = "const assistantMessageIndex = aiConversationHistory.push({ role: 'assistant', content: '' }) - 1;\\n" +
"            renderAiConversation();\\n" +
"            \\n" +
"            const response = await callAiApi(messages, {\\n" +
"                systemPrompt: '你是一位专业、友好的健康顾问。请基于已有诊断结果继续回答用户追问，避免重复整份报告；保持中文表达清晰简洁；不要做医疗诊断结论，对于明显异常情况建议咨询专业医生。',\\n" +
"                onChunk: (chunk, fullText) => {\\n" +
"                    aiConversationHistory[assistantMessageIndex].content = fullText;\\n" +
"                    const container = document.getElementById('aiChatMessages');\\n" +
"                    if (container) {\\n" +
"                        const lastMsg = container.lastElementChild;\\n" +
"                        if (lastMsg) lastMsg.querySelector('.ai-chat-content').innerHTML = formatAiResponse(fullText) + '<span class=\"ai-cursor\"></span>';\\n" +
"                        container.scrollTop = container.scrollHeight;\\n" +
"                    }\\n" +
"                }\\n" +
"            });\\n" +
"            aiConversationHistory[assistantMessageIndex].content = response;\\n" +
"            renderAiConversation();\\n" +
"            markAiConfigVerified();";

js = js.replace(/const response = await callAiApi\(messages, \{[\s\S]*?aiConversationHistory\.push\(\{ role: 'assistant', content: response \}\);/, newFollowup);

fs.writeFileSync('app.js', js, 'utf8');
console.log('Stream injected successfully.');
