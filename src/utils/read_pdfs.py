import os
import sys
import json
import arxiv
import fitz
import re
from pathlib import Path
from collections import defaultdict
import json
ARXIV_FOMART = r'\d{4}\.\d{4,5}'

def read_pdf_titles(filename):
    # directory = os.path.join(folder['path'],folder['name'])
    filename = Path(filename)
    paper_info = defaultdict(str)
    try:
        if re.match(ARXIV_FOMART, filename.stem):
            paper = next(arxiv.Client().results(arxiv.Search(id_list=[filename.stem])))
            paper_info['title'] = str(paper.title)
            paper_info['authors'] = [str(authors) for authors in paper.authors]
            if len(paper.authors) > 2:
                paper_info['authors'] = paper_info['authors'][:2] + ['et al.']
            paper_info['authors'] = ', '.join(paper_info['authors'])
        else:
            with fitz.open(filename) as doc:
                paper_info['title'] = doc.metadata['title']
                paper_info['authors'] = doc.metadata['author']
                paper_info['published'] = doc.metadata['creationDate']
                paper_info['updated'] = doc.metadata['modDate']
    except Exception as e:
        print(f"Error reading {filename}: {e}", file=sys.stderr)
    print(json.dumps(paper_info))

if __name__ == "__main__":
    filename = sys.argv[1] if len(sys.argv) > 1 else '.'
    titles = read_pdf_titles(filename)
    # print(titles)
