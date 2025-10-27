# 정처기 실습 모음집
# 자료
# - https://complainrevolutionist.tistory.com/210

# 1번
a={'한국','중국','일본'}
a.add('베트남')
a.add('중국')
a.remove('일본')
a.update(['한국','홍콩','태국'])
print(a)
## 내답: {'한국','중국','일본', ['한국','홍콩','태국']} 
## 결과: 틀림!!

# 2번: 20년 4회
lol = [[1,2,3],[4,5],[6,7,8,9]]
print(lol[0])
print(lol[2][1])
for sub in lol:
  for item in sub:
    print(item, end = '')
  print()
## 내답:
## [1, 2 ,3]
## 7
## 1 ~ 9까지 전부 출력 + '' 빈공백 -> '1 ', '2 '
## 마지막 빈칸
## 결과: 틀림!!

# 3번: 21년 1회
class good :
	li = ["seoul", "kyeonggi","inchon","daejeon","daegu","pusan"]
 
g = good()
str01 = ''
for i in g.li:
	str01 = str01 + i[0]
    
print(str01)
## 내답: seoulkyeonggi 이런 식으로 전부 이어서 나옴
## 결과: 틀림!!

## 4번: 21년 2회
a = 100
result = 0
for i in range(1,3):
   result = a >> i # 비트연산자 기억필요
   result = result + 1
print(result)


# 5번: 21년 3회
a,b = 100, 200 
print(a==b)
## 내답: false
## 결과: O


# 6번: 22년 1회
def exam(num1, num2=2):
  print('a=', num1, 'b=', num2)
exam(20)
## 내답: a=20b=2
## 결과: O


# 7번: 22년 2회
a="REMEMBER NOVEMBER"
b=a[:3]+a[12:16]
c="R AND %s" % "STR";
print(b+c)
## 내답: REMEMBER AND STR
## 결과: X


# 8번: 22년 3회
TestList = [1,2,3,4,5]
TestList = list(map(lambda num : num + 100, TestList))
 
print(TestList)
## 내답: [101, 102, 103, 104, 105]
## 결과: O


# 9번: 23년 1회
a={'한국','중국','일본'}
a.add('베트남')
a.add('중국')
a.remove('일본')
a.update(['한국','홍콩','태국'])
print(a)

## 내답: {'베트남', '중국', '한국','홍콩','태국'}
## 결과: O
## 노트: set의 출력 순서는 무작위다!!!


# 10번: 23년 2회
a = "engineer information processing"
b = a[:3] #eng
c = a[4:6] #ne
d = a[28:] # ssing
e=b+c+d
print(e)

## 내답: engnessing
## 결과: X


# 11번: 23년 3회
# num1, num2 = input().( 가 )(분리문자)
## 내답: split
## 결과: O -> 운좋게


# 12번: 24년 1회
a = ["Seoul", "Kyeonggi", "Incheon", "Daejun", "Daegu", "Pusan"] 
str = "S"
 
for i in a:
    str = str + i[1]

print(str)
## 내답: Seynaau
## 결과: O


# 12번: 24년 2회
def fnCalculation(x,y):
    result = 0;
    for i in range(len(x)):
     temp = x[i:i+len(y)] 
     if temp == y:
       result += 1;
    return result

a = "abdcabcabca" # 길이: 11
p1 = "ab";
p2 = "ca";
 
out = f"ab{fnCalculation(a,p1)}ca{fnCalculation(a,p2)}"
print(out)

## 내답: ab3ca3   
## 결과: O
## 노트: f는 다음과 같음
### name = "홍길동"
### age = 30
###   print(f"이름은 {name}이고 나이는 {age}살입니다.")


# 13번: 24년 3회 6번
def func(lst):
  for i in range(len(lst) //2):
    lst[i], lst[-i-1] = lst[-i-1], lst[i]
 
lst = [1,2,3,4,5,6] 
func(lst)
print(sum(lst[::2]) - sum(lst[1::2]))
## 내답: 4
## 결과: XX
## 노트
### seq[start:end:step]
#### start	시작 인덱스	0
#### end	끝 인덱스(포함 X)	len(seq)
#### step	간격(몇 칸씩 건너뛸지)	1


# 14번: 24년 3회 10번
def func(value):
  if type(value) == type(100):
      return 100
  elif type(value) == type(""):
      return len(value) 
  else:
      return 20
 
a = '100.0' # 5
b = 100.0 # 100 -> float타입이다....
c = (100, 200) # 20
 
print(func(a) + func(b) + func(c))
## 내답: 125
## 결과: XXXX


# 15번: 25년 1회
class Node:
    def __init__(self, value):
        self.value = value
        self.children = []
 
def tree(li):
    nodes = [Node(i) for i in li]
    for i in range(1, len(li)):
        nodes[(i - 1) // 2].children.append(nodes[i])
    return nodes[0]
 
def calc(node, level=0):
    if node is None:
        return 0
    return (node.value if level % 2 == 1 else 0) + sum(calc(n, level + 1) for n in node.children)
 
li = [3, 5, 8, 12, 15, 18, 21]
# [node3, node5, node12, node15, node18, node21]
# range(1, 6) => [1, 2, 3, 4, 5]

root = tree(li)
 
print(calc(root))
