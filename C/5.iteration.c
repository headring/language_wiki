#include <stdio.h>


int main(void){
  // 반복문 중에 JS에 없는 것이 do while
  // do while은 먼저 수행후 조건판단
  int pw = 1234;
  int inputpw = 0;
 
  do{
    printf("비밀번호를 입력하세요. : ");
    scanf("%d", &inputpw);
  } while (pw != inputpw);
 
  printf("확인되었습니다.\n");
 
  return 0;


}
