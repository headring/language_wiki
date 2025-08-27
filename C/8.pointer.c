#include <stdio.h>

int worngConnection(void);
int pointerFunc(void);

int main(void){
  int x;
  x= 10;

  // 주소를 할당한다
  int *p;
  p = &x;
  printf("주소 내부의 값은 %d \n", *p);

  int s[3] = {1, 2, 3};
  // s[0] 또는 *s === 1
  // s[1] 또는 *(s+1) === 2
  // s[2] 또는 *(s+2) === 3

  printf("배열 내부의 값은 %d \n", *(s+1));
 
  return 0;

}

// 심화 내용

// 포인터의 대상 자료형은 그 포인터가 가리키는 대상의 자료형돠 반드시 일치. 아래는 안 됨
int wrongConnection()
{
  int *ip;
  double d = 3.14;
  ip = &d; //  warning: assignment to ‘int *’ from incompatible pointer type ‘double *’
  *ip = 11.5;
  return 0;
}

// 심화 패턴1
int pointerFunc(void){
  int n1, n2; 
  int *p1, *p2; //pointer 변수 선언

  n1 = 4;
  n2 = 15;
  p1 = &n1; // p1에 n1주소를 할당
  p2 = &n2; // p2에 n2주소를 할당

  *p1 = 9; // *p1이라고 지칭한 다는 것은 p1이 가리키는 곳. 즉, n1이고 거기다가 9를 할당. -> n1 = p1 = 9
  
  *p1 = *p2; // 위와 같이 p1이 가리키는 주소에 p2의 주소값을 보면 원시값 15를 가지고 있음. 
  // 즉 n1 = p1 = 15, n2 = p2 = 15 이렇게 두개로 나뉨

  p1 = p2; // p1 = p2 = n2 = 15, n1 = 15

  // 여기서 최종적으로 정리하면
  // n1은 15이고
  // n2는 15인데 이 주소에 p1, p2가 연결되어 있음

  return 0;
}