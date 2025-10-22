# 숫자형
a = 1
print(type(a))

# 문자열
b = 'food'
head = 'python'
tail = 'jumping'
print(head + tail)
print(head * 2)
print(len(head))

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


