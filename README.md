# <a name="_h5g52e3ak3v5"></a>БЭКЕНД
## <a name="_1wlm3irnuvx0"></a>**Общая информация**

|**Характеристика**|**Значение**|
| :-: | :-: |
|Язык программирования|Python|
|Фреймворк|Flask|
|СУБД|PostgreSQL|
|Инструмент работы с СУБД|SQLAlchemy|
|GitHub|<https://github.com/Pacifica123/water_project/tree/master>|

### <a name="_pvdwpva1vq8p"></a>Терминология
Модель = Таблица в БД - это синонимы.

OCR (optical character recognition) - это технология распознавания символов.

venv = linuxenv(в данном проекте) - виртуальное окружение python (НЕ ПУТАТЬ С .[env](#kix.rxly68haagic))

OperationResult - структура состоящая из OperationStatus, message и data, есть желание и стремление пихать на возврат любой функции именно такую структуру - это полезно… 
## <a name="_5krc92jao9g"></a>**Структура проекта**
### <a name="_ivtmrionvap9"></a>Каталогизация бэкенда

<table><tr><th valign="top"><b>Папка</b></th><th valign="top"><b>Файл</b></th><th valign="top"><b>Описание</b></th></tr>
<tr><td><b>data</b></td><td>examples.py</td><td valign="top">По идее это должно было стать универсальным транслейтом но что-то пошло не так… балласт</td></tr>
<tr><td rowspan="4"><b>db</b></td><td>config.py</td><td valign="top">просто загружает DATABASE_URI и LONG_KEY из env</td></tr>
<tr><td>crudcore.py</td><td valign="top">Здесь собраны все CRUD-функции обращенные напрямую к БД через SQLAlchemy</td></tr>
<tr><td>models.py</td><td valign="top">Де-факто схема БД, здесь собраны все модели и перечисления. Посмотреть можно [тут](https://drive.google.com/file/d/1wx6erL3gKE9vjrKjQ4euWJd-ThRYn3Az/view?usp=sharing) но не всегда актуально…</td></tr>
<tr><td>setup.py</td><td valign="top">на основе флага DELETE_DB из .env определяет пересоздать ли БД с нуля полностью или же просто создать движок для работы с ней.</td></tr>
<tr><td><b>linuxenv</b></td><td><p>./bin/pip3.12</p><p>./bin/python3.12</p></td><td valign="top">Собственной персоной интерпретатор и менеджер пакетов… </td></tr>
<tr><td rowspan="3"><b>routes</b></td><td>api.py</td><td valign="top">Здесь все роутеры к которым и обращается фронтенд… </td></tr>
<tr><td>backend.py</td><td valign="top">Внутренняя кухня которая варится в собственном соку… </td></tr>
<tr><td><s>frontend.py</s></td><td valign="top">Когда-то здесь были фронтенд-роутеры но теперь это балласт</td></tr>
<tr><td><b><s>static</s></b></td><td><s>styles.css</s></td><td valign="top">Такой же балласт как и frontend.py</td></tr>
<tr><td><b><s>templates</s></b></td><td><s>куча html файлов</s></td><td valign="top">Когда-то это был визуал фронтенда но теперь это просто балласт</td></tr>
<tr><td rowspan="4"><b>utils</b></td><td>backend_chain_validation.py</td><td valign="top">Это должен был быть разветвитель для валидаторов, используется в rest_edit_reference в api.py</td></tr>
<tr><td>backend_utils.py</td><td valign="top">Именно здесь определены OperationResult и его составляющие, а еще тут проверки всякие на валидность</td></tr>
<tr><td>db_utils</td><td valign="top">всякие функции вспомогательные связанные с БД</td></tr>
<tr><td>pre_initial_for_app_records.py</td><td valign="top">Инициализирует перед развертыванием приложения некоторые тестовые записи для БД чтоб не вводить самому. </td></tr>
<tr><td rowspan="3"><b>utils/validators</b></td><td>auth_validation.py</td><td valign="top">Проверяет авторизован ли пользователь, а также генерирует токен при корректном входе в систему</td></tr>
<tr><td>employee_validation.py</td><td valign="top">Нигде не используется, балласт</td></tr>
<tr><td>models_validators.py</td><td valign="top">Какие-то проверяшки для моделей, сейчас вроде не используются (?)</td></tr>
<tr><td rowspan="3"><b>/</b></td><td>app.py</td><td valign="top">Главный файл через который запускается бэкенд и откуда все стартует</td></tr>
<tr><td>.<a name="kix.rxly68haagic"></a>env</td><td valign="top">Виртуальная среда, которая содержит DATABASE_URI для подключения к БД, LONG_KEY для безопасности и DELETE_DB для пересоздания БД если нужно</td></tr>
<tr><td>req.txt</td><td valign="top">содержит список зависимостей pip</td></tr>
</table>
###
### <a name="_ja4oaq1rnv88"></a><a name="_nalvw37ya56r"></a>Функции CRUDCORE

|Секция|Функция|Назначение|Параметры|
| :- | :- | :- | :- |
|||||

### <a name="_jfs0ey9rev7s"></a>Функции API

|**Роутер**|**URL**|**Методы**|**Описание**|**Требования**|
| :- | :- | :- | :- | :- |
|rest\_login|/api/login|POST|Проверяет вход и возвращает токен при успешной авторизации|<p>username</p><p>password</p>|
|rest\_get|/api/get\_struct|GET|Получает список [сложных структур](https://docs.google.com/document/d/12xF7Aw8Ntm-AejmpgvR9m7XpijMyzv6D/edit#bookmark=id.hzjmxu31wjm)|<p>token</p><p>struct\_name</p><p>filter\_k, filter\_v</p>|
|<p>rest\_</p><p>edit\_reference</p>|/api/edit\_reference|<p>GET</p><p>POST</p>|По идее создан для работы только со справочниками но что-то  пошло не так… |<p>token</p><p>selected\_reference</p><p>data (POST)</p>|
|send\_to|/api/send\_form|POST|Создан для обработки внесения данных [сложной структуры](https://docs.google.com/document/d/12xF7Aw8Ntm-AejmpgvR9m7XpijMyzv6D/edit#bookmark=id.aflhop4ecyma) (формы) в БД|<p>token</p><p>[send_form](https://docs.google.com/document/d/12xF7Aw8Ntm-AejmpgvR9m7XpijMyzv6D/edit#bookmark=id.aflhop4ecyma)</p><p>data</p>|

### <a name="_7km3wqinvvz4"></a>Функции BACKEND

|Секция|Функция|Описание|Параметры|
| :- | :- | :- | :- |
|||||

## <a name="_lf7nzzflrett"></a>**Примечания и комментарии**
