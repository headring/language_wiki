# while문
num = 1
while num <= 100:
  print(num)
  num = num + 1


# if-elif-else
c = 15 * 5
d = 15 + 15 + 15 + 15 + 15
if c > d:
  print('c is greater than d')
elif c == d:
  print('c is equal to d')
elif c < d:
  print('c is less than d')
else:
  print('I don\'t know')


# for
family = ['mother', 'father', 'gentleman', 'sexy lady']
for x in family:        # family의 각 항목 x에 대하여:
  print(x, len(x))    # x와 x의 길이를 출력하라.


# range
print(list(range(2, 7)))   # 파이썬 3: [2, 3, 4, 5, 6]
for i in range(4, 8): # 이런 range 형태라도 반복문 작동을 잘 함
  print(i)


# split
print('0 100'.split()) # ['0', '100']


## 반본문에서 else:
# 정상적으로 루프가 끝났을 때 작동 
# break로 중간에 끝나면 else 미실행

# for-else
for x in [1, 2, 3, 4]:
     print(x)
else:
     print("리스트의 원소를 모두 출력했어요")
# 1 2 3 4 리스트의 원소를 모두 출력했어요

# while-else
n = 0
while n < 3:
    print(n)
    n += 1
else:
    print("루프 정상 종료")