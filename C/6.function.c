#include <stdio.h>


/**
 * 함수의 기본형태
  * 반환형 함수이름(매개변수){
    함수 내용
  }
 */
// **main() 함수 뒤에 등장하는 함수는 컴파일러가 알지 못하기 때문에 오류가 발생하기에 먼저 함수 선언 필요**
// 함수 선언만 한다면 int sum(int a, int b)하고 main 밑에서 아래 함수를 정의. 아니면 아래와 같이 선언 정의 먼저 가능
int sum(int a, int b)
{
    int hap;
 
    hap = a + b;
 
    return hap;
}

// 아래 함수들은 main 아래에서 참조
void voidFunction(int num);
int InputNum(void); 
void plusplus(void);

int main(void){

  int result = sum(1, 5);
  printf("result는 %d입니다.\n", result);

  return result;

}

// void라는 타입으로 선언하여 반환문이 없다라는 것도 표현 가능
void voidFunction(int num)
{
  printf("덧셈결과 출력 : %d\n", num);
}

// 여기서 사용한 void에는 '매개변수를 전달하지 않는다.'라는 뜻. 
// 그리고 반환 및 매개변수도 void로 둘다 선언 가능
int InputNum(void)    
{
    int num;
    scanf("%d", &num);
 
    return num;
}


// 함수의 변수들
/**
 * static 변수 선언: static 자료형 변수이름;
 * 일반 변수들은 실행마다 메모리 할당되고 사라지나, static은 프로그램이 끝나기 전까지 존재
 * 아래를 5회 반복하면 static num2는 5로 나옴
 */
void plusplus(void)
{
    int num1 = 0;    // 일반 지역변수로 선언
    static int num2 = 0;    // static 변수로 선언
    
    num1++;
    num2++;
 
    printf("local : %d, static : %d\n", num1, num2);
}

/**
 * register 자료형 변수이름
 * CPU를 활용하는 빠른 처리를 하기위해서 선언되지만, 컴파일러가 알아서 등록 또는 미등록하기도 함
 * 요즘에는 거의 이용 X
 */

 