package com.lab.gateway.person.repository;

import static org.assertj.core.api.Assertions.assertThat;

import com.lab.gateway.common.enums.PersonRole;
import com.lab.gateway.common.enums.PersonStatus;
import com.lab.gateway.person.entity.Person;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.MySQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

@Testcontainers
@SpringBootTest
class PersonRepositoryIntegrationTest {

    @Container
    static final MySQLContainer<?> MYSQL = new MySQLContainer<>("mysql:8.0")
            .withDatabaseName("lab_person")
            .withUsername("lab")
            .withPassword("labpass");

    @DynamicPropertySource
    static void datasource(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", MYSQL::getJdbcUrl);
        registry.add("spring.datasource.username", MYSQL::getUsername);
        registry.add("spring.datasource.password", MYSQL::getPassword);
    }

    @Autowired
    private PersonRepository repository;

    @Test
    void savesAndQueriesPerson() {
        Person person = new Person();
        person.setName("张三");
        person.setRole(PersonRole.STUDENT);
        person.setStatus(PersonStatus.ACTIVE);

        Person saved = repository.save(person);

        assertThat(saved.getId()).isNotNull();
        assertThat(repository.findById(saved.getId()))
                .get()
                .extracting(Person::getName)
                .isEqualTo("张三");
        assertThat(repository.findByRole(PersonRole.STUDENT))
                .extracting(Person::getName)
                .contains("张三");
    }
}
