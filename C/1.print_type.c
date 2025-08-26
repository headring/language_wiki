#include <stdio.h>
// 위 구간을 "헤더 파일이라고 지칭"

int main(void)
{
  /**
   * printf
   */
  printf("안녕하세요?\n");
  // %d는 데이터를 10진수(decimal)의 형태로 출력한다는 의미
  printf("제 나이는 %d살입니다.\n", 21);


  /**
   * scanf: 유저한테 입력값을 받을 수 있는 형태
   * - 첫번째 인자는 자료형을, 두번째는 할당할 변수를 그리고 이름 앞에 &(주소 연산자)
   */
  int result;
  int num1, num2;

  printf("첫번째 정수를 입력하세요 : ");
  scanf("%d", &num1);
  printf("두번째 정수를 입력하세요 : ");
  scanf("%d", &num2);
 
  result = num1 + num2;
  printf("%d + %d = %d", num1, num2, result);



  return 0;

}