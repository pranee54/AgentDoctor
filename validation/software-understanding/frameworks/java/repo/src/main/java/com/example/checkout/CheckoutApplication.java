package com.example.checkout;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import com.example.payments.PaymentService;
@SpringBootApplication
public class CheckoutApplication {
  public static void main(String[] args) {
    SpringApplication.run(CheckoutApplication.class, args);
    new PaymentService().charge();
  }
}
