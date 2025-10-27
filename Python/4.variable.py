# 숫자형
a = 1
print(type(a))

# -------------------

# 문자열
b = 'food'
head = 'python'
tail = 'jumping'
print(head + tail)
print(head * 2)
print('문자열 len: ',len(head))

print(b[2]) # o
print(b[-1]) # d
newWord =  head[0] + tail[-1]
print(newWord) # pg
print(b[0:2]) # fo

## 문자열 포맷팅
print("I eat %d apples." % 1)


## format을 활용한 포맷팅
print("I eat {0} apples".format(3))
number = 5
print("I eat {0} apples".format(number))
print("I ate {0} apples. so I was sick for {1} days.".format(number, 2))
print("I ate {number} apples. so I was sick for {day} days.".format(number=10, day=3))
## 등등 소수점 표현 등등.....
## python 3에서 fomrat 말고 아래와 같이 f도 가능
print(f'나는 내년이면 {number + 1}살이 된다.')

# -------------------

# 리스트
print('리스트 시작')
odd = [1, 3, 5, 7, 9]
print(odd[0:2]) # [1, 3]

even = [2, 4, 6, 8, 10]
print(odd + even)


리스트수정 = [1, 2 ,3]
리스트수정[2] = 4
print('리스트 수정', 리스트수정)

del 리스트수정[1]
print('리스트 삭제', 리스트수정)

# -------------------

# 튜플
## 튜플은 변경이 불가능하다
t1 = (1, 2, 3)
print("t1[0]", t1[0])

## 더하기도 슬라이싱도 가능
print(t1[1:])
t2 = (3, 4)
print(t1 + t2)

# -------------------

# 딕셔너리 자료형
## value가 변하지 않는 값은 키값으로 활용 가능
dic = {
  'name': 'pey',
  'phone': '010-9999-1234',
  'birth': '1118'
}
print('dic.keys()', dic.keys())

## 존재하는지 체크
print('존재하는지 체크: name in dic', "name" in dic)

# -------------------

# 집합 자료형: 중복을 허용하지 않고 순서가 없는 데이터들의 모임
s1 = set([1, 2, 3]) # {1, 2, 3}
s2 = set("Hello") # {'e', 'H', 'l', 'o'}
s22 = { 1, 2 , 3 }

## 집합의 교집합, 합집합, 차집합 구하기
s3 = set([1, 2, 3, 4, 5, 6])
s4 = set([4, 5, 6, 7, 8, 9])

print("s3 & s4", s3 & s4) # 동일 s3.intersection(s4)
print("s3 | s4", s3 | s4) # 동일 s3.union(s4)
print("s3 - s4", s3 - s4) # 동일 s3.difference(s4)

