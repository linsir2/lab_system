package com.lab.gateway.person.repository;

import com.lab.gateway.common.enums.PersonRole;
import com.lab.gateway.common.enums.PersonStatus;
import com.lab.gateway.person.entity.Person;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PersonRepository extends JpaRepository<Person, Long> {

    List<Person> findByRole(PersonRole role);

    List<Person> findByStatus(PersonStatus status);

    List<Person> findByRoleAndStatus(PersonRole role, PersonStatus status);
}
