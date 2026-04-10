import os
import json
import urllib.request

def call_openrouter(prompt, system_prompt="You are a helpful assistant."):
    """
    Direct low-level call to OpenRouter API using built-in urllib.
    Avoids external dependencies like langchain-openai/requests.
    """
    api_key = os.getenv("OPENROUTER_API_KEY")
    url = "https://openrouter.ai/api/v1/chat/completions"
    
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
        "HTTP-Referer": "https://nike-agentic-poc.local", # Optional
        "X-Title": "Nike Agentic POC", # Optional
    }
    
    data = {
        "model": "google/gemini-2.0-flash-001",
        "temperature": 0.1,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": prompt}
        ]
    }
    
    req = urllib.request.Request(url, data=json.dumps(data).encode("utf-8"), headers=headers)
    
    try:
        with urllib.request.urlopen(req) as response:
            res_data = json.loads(response.read().decode("utf-8"))
            return res_data["choices"][0]["message"]["content"]
    except Exception as e:
        print(f"OpenRouter Error: {e}")
        raise e
