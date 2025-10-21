# 선언
def print_list(a):  # 지금부터 print_list 함수를 만들겠다는 뜻
  for i in a:
    print(i)

# 반환
def f1(x):
  a = 3
  b = 5
  y = a * x + b
  return y             # y 값을 반환한다
c = f1(10)             # c = 35
print(c)
