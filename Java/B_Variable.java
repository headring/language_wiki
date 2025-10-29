import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.Arrays;

public class B_Variable {
  public static void main(String[] args) {
    System.out.println("Start app!");
    // list();
    // map();
    setVariable();
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
  }
}

