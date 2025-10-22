#include <stdio.h>
#include <string.h>

int main(void){
  // 배열 선언시 뒤에 []를 붙이고 선언하면서 값을 초기화시킬 때는 {}를 사용
  // 자료형 배열이름[크기] = { 값, 값, 값 };
  int newArray[3] = {1, 2, 3};

  // char형 배열
  // char형 배열을 선언할 때는 최소한 하나 이상 크게 배열 선언 필요
  char str1[20];
  strcpy(str1, "something"); // strcpy는 string copy의 약자이며 string.h 안에 존재


  /** 2차원 배열  */ 
  // 자료형 배열이름[세로(열)길이][가로(행)길이];
  int array2[3][3] = {
    {1, 2, 3},
    {4, 5, 6},
    {7, 8, 9},
  };
  
  // 문자열 배열 = char 배열이름[문자열 개수][각 문자열 당 문자의 개수 + 1]
  char fourTrigrams[4][7] = { "Heaven", "Earth", "Water", "Fire" };
  // 첫번째 배열의[0]은 "H" 이런식으로 저장
  // 'H', 'e', 'a', 'v', 'e', 'n', '\0' -> 끝에는 항상 \0으로 저장

  for (int i = 0; i < 4; i++){
    printf("[%s]\n", fourTrigrams[i]);
  }
 
  return 0;

}
