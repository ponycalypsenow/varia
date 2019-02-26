import os, re
from flask import Flask, render_template, request
from requests_html import HTMLSession

app = Flask(__name__)

@app.route('/', methods=['GET', 'POST'])
def index():
    errors = []
    results = {}
    if request.method == 'POST':
        url = ''
        bodyText = ''
        try:
            url = request.form['url']
            if not url.startswith('http'):
                url = 'http://{0}'.format(url)
            r = HTMLSession().get(url)
            keywords = r.html.find('meta[name=Keywords]', first=True) or r.html.find('meta[name=keywords]', first=True)
            if keywords is not None:
                keywords = keywords.attrs.get('content', '') or keywords.attrs.get('Content', '') or []
                keywords = [k.strip() for k in keywords.split(',')]
                keywords = [k for k in keywords if len(k) > 0]            
            if keywords is None or len(keywords) == 0:
                errors.append('Brak słów kluczowych na stronie ({0})'.format(url))
            else:
                bodyText = r.html.find('body', first=True).text
                for keyword in keywords:
                    results[keyword] = len(re.findall(r'\b{0}\b'.format(keyword), bodyText, re.IGNORECASE))
        except Exception as e:
            errors.append('Nie udało się pobrać strony o podanym adresie ({0})'.format(url))
    return render_template('index.html', errors=errors, results=results)

if __name__ == '__main__':
    app.run()
