import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.Arrays;

public class B_Variable {
  public static void main(String[] args) {
    System.out.println("Start app!");
    // list();
    // map();
    // setVariable();
    enumVariable();
  }

  //숫자
  public static void numberVariable(){
    // 정수
    int age = 10;
    long starAge = 8764827384923849L;

    // 실수
    float pi = 3.14F;
    double morePi = 3.14159265358979323846;
  }

  // boolean
  public static void boolVariable(){
    boolean isSuccess = true;
    boolean test = isSuccess == true;
  }

  // String
  public static void stringVaraible(){
    // 아래는 문자 타입
    char a1 = 'a';

    // 여기서부터는 문자열(대부부 문자열 사용)
    String a = "Happy Java"; // 문자열의 앞과 뒤는 쌍따옴표("")로 감싸야 한다.
    String b = new String("Happy Java");
    String c = "Happy Java";

    // 문자열 내장 메서드
    System.out.println(a.equals(c)); // true 출력
    System.out.println(a.substring(0, 4));  // Happ 출력
    System.out.println(a.toUpperCase());  // HAPPY JAVA

    String d = "a:b:c:d";
    String[] dSplit = d.split(":");  // result는 {"a", "b", "c", "d"}

    System.out.println(String.format("I eat %s apples.", "five"));  // "I eat five apples." 출력
  } 


  // StringBuffer - 문자열에 추가로 할당이 불가능하지만 StringBuffer 타입은 문자열 추가 가능
  public static void stringBufferVariable(){
    StringBuffer sb = new StringBuffer();  // StringBuffer 객체 sb 생성
    sb.append("hello");
    sb.append(" ");
    sb.append("jump to java");
    String result = sb.toString();

    System.out.println(result);  // "hello jump to java" 출력
  }


  // 배열
  public static void array(){
    int[] odds = {1, 3, 5, 7, 9};
    String[] weeks = {"월", "화", "수", "목", "금", "토", "일"};

    // 배열 길이 정하기
    String[] weeks2 = new String[7]; // 길이가 7인 배열 생성
  }

  // 리스트 - 배열과 비슷하지만 크기가 동적으로 변하며 추가 기능 제공
  public static void list(){
    // import java.util.ArrayList 추가 후 사용하는 방향

    ArrayList pitches = new ArrayList();
    pitches.add("138");
    pitches.add("129");
    pitches.add(0, "142"); // 0번째 index에 142를 삽입
    System.out.println(pitches);  // [142, 138, 129]

    System.out.println(pitches.get(1));
    System.out.println(pitches.size());
    System.out.println(pitches.contains("142"));
    System.out.println(String.join(",", pitches));
  }


  public static void map(){
    // HashMap, LinkedHashMap, TreeMap 존재

    // HashMap: import java.util.HashMap; 추가하여 사용
    HashMap<String, String> map = new HashMap<>();
    map.put("people", "사람");
    map.put("baseball", "야구");
    System.out.println(map.get("baseball"));
    System.out.println(map.containsKey("people"));  // true 출력
    System.out.println(map.keySet());  // [baseball, people] 출력

    // LinkedHashMap : 입력된 순서대로 데이터를 저장한다.
    // TreeMap : 입력된 key의 오름차순으로 데이터를 저장한다.
  }


  // 집합(set): 순서가 없다(unordered) + 중복을 허용하지 않는다.
  public static void setVariable(){
    // import java.util.HashSet; 추가
    HashSet<String> set = new HashSet(Arrays.asList("H", "e", "l", "l", "o"));
    System.out.println(set);  //  [e, H, l, o] 출력 

    HashSet<Integer> s1 = new HashSet<>(Arrays.asList(1, 2, 3, 4, 5, 6));
    HashSet<Integer> s2 = new HashSet<>(Arrays.asList(4, 5, 6, 7, 8, 9));
    // 교집합
    HashSet<Integer> intersection = new HashSet<>(s1);  // s1으로 intersection 생성
    intersection.retainAll(s2);  // 교집합 수행
    System.out.println(intersection);  // [4, 5, 6] 출력

    // 합집합
     HashSet<Integer> union = new HashSet<>(s1);  // s1으로 union 생성
    union.addAll(s2); // 합집합 수행
    System.out.println(union);  // [1, 2, 3, 4, 5, 6, 7, 8, 9] 출력

    // 차집합
    HashSet<Integer> subtract = new HashSet<>(s1);  // s1으로 subtract 생성
    subtract.removeAll(s2); // 차집합 수행
    System.out.println(subtract);  // [1, 2, 3] 출력
  }


  // 상수 집합 -> as const랑 비슷비슷
  public static void enumVariable(){
    enum CoffeeType {
      AMERICANO,
      ICE_AMERICANO,
      CAFE_LATTE
    };

    System.out.println(CoffeeType.AMERICANO);
    System.out.println(CoffeeType.values());
    for(CoffeeType type: CoffeeType.values()) {
      System.out.println(type);  // 순서대로 AMERICANO, ICE_AMERICANO, CAFE_LATTE 출력
    }
  }


  // final 키워드
  public static void finalVariable(){
    final int n = 123;  // final로 설정하면 값을 바꿀 수 없다.
    // n = 456;  // 컴파일 오류 발생
  }


}

