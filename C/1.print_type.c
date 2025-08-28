#include <stdio.h>
// 위 구간을 "헤더 파일이라고 지칭"

int diffFormat(void);
int tohexadecimal(void);


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

// https://reakwon.tistory.com/169에서 일부분 발췌
int diffFormat(void)
{
  // 다양한 출력 형식을 지원
  // 정수 - d
  printf("%d", 150);

  /** 문자열 */
  // %c - 문자열 하나 출력
  printf("%c", 'A');
  // %s - \0인 NULL 문자를 만날 떄까지 문자열 출력. 
  printf("%s", "KOREA"); // KOREA
  printf("%s\n", "KOREA"); // EA

  /** 주소 */
  // %p
  int a;
  printf("%p", &a);

  /** 정수에서 16진수로 */
  // %x: 정수를 16진수로 변환 및 소문자 표시 - x
  printf("%x",10);	// 'a'
  // %X: 정수를 16진수로 변환 및 대문자 표시 - x
  printf("%X",10);	// 'A'

  /** 8진수로 출력 */
  // %o
 


  // 출력기출문제 
  /** !! 대부분 %s, %c, %d만 나오는 경향 !!  */ 
  char *p="KOREA";
  printf("%s\n",p);
  printf("%s\n",p+3);
  printf("%c\n",*p);
  printf("%c\n",*(p+3));
  printf("%c\n",*p+2); // ASCII로 75로 변환 후 +2하여 77을 다시 문자인 M

  return 0;
}

// 16진수 변환법
int tohexadecimal(void)
{
  /**
   * 2431
   * 2431 / 16 = 151, 15 -> F
   * 151 / 16 = 9 , 7 -> 7
   * 9 / 16 = 0, 9 -> 7
   * 정답: 97F
   */
  return 0;
}
