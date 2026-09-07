# tools/fnmap.py — stdin 의 JS/HTML 에서 '함수이름 <TAB> 본문md5 <TAB> 줄수' 를 정렬 출력
import sys, re, hashlib
src = sys.stdin.buffer.read().decode('utf-8')
out, name, buf = [], None, []
for line in src.split('\n'):
    m = re.match(r'^        (?:async )?function ([A-Za-z0-9_$]+)\s*\(', line)
    if m and name is None:
        name, buf = m.group(1), [line]
        continue
    if name is not None:
        buf.append(line)
        if line == '        }':
            body = '\n'.join(buf)
            out.append('%s\t%s\t%d' % (name, hashlib.md5(body.encode()).hexdigest()[:12], len(buf)))
            name, buf = None, []
print('\n'.join(sorted(out)))
