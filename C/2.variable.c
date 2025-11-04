#include <stdio.h>
// 메크로 상수
#define PI 3.14159265
// const 변수는 컴파일 타임에 자료형 검사 가능
const int PI2 = 3.14159265;


int main(void)
{
  // 변수는 자료형 + 변수이름으로 지정
  int num;
  num = 10; // 변수에 값을 저장

  // 아래와 같이 같이 변수 선언 및 값 할당 가능
  int num2 = 10;

  // 동시 선언도 가능하고
  int num1, num0;
  // 동시 선언 및 할당도 가능
  int num3 = 30, num4 = 40;   

  printf("출력되는되, %d, %d, %d", num, num2, num4);

  // C언어는 다음 기본 자료형
  // 정수형 타입들
  char characted; // 1바이트
  short shorted; // 2바이트
  int inted; // 4바이트
  long longed; // 4바이트/8바이트
  long long longedTwo; // 8바이트

  // 실수형
  float floated; // 4바이트
  double doulbed; // 4바이트
  long double LongDoulbed; // 4바이트

  return 0;
}